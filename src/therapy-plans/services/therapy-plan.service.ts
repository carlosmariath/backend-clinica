import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTherapyPlanDto } from '../dto/create-plan.dto';
import { UpdateTherapyPlanDto } from '../dto/update-plan.dto';
import { TherapyPlanDto, BranchDto } from '../dto/therapy-plan.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TherapyPlanService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mapeia um plano do banco de dados para o formato padronizado do DTO
   */
  private mapTherapyPlanToDto(plan: any): TherapyPlanDto {
    // Criar array de branches a partir de branchLinks (TherapyPlanBranch) ou do campo branches
    const branchesData: BranchDto[] = [];
    
    // Usar branchLinks se disponível
    if (
      plan.branchLinks &&
      Array.isArray(plan.branchLinks) &&
      plan.branchLinks.length > 0
    ) {
      plan.branchLinks.forEach(
        (link: { branch?: { id: string; name: string } }) => {
          if (link.branch) {
            branchesData.push({
              id: link.branch.id,
              name: link.branch.name,
            });
          }
        },
      );
    }
    // Ou usar campo virtual branches se disponível
    else if (
      plan.branches && 
      Array.isArray(plan.branches) && 
      plan.branches.length > 0
    ) {
      plan.branches.forEach((branch: any) => {
        // Se branch é uma relação direta com Branch
        if (branch.name && branch.id) {
          branchesData.push({
            id: branch.id,
            name: branch.name,
          });
        }
        // Se estamos lidando com TherapyPlanBranch, temos que buscar a branch associada
        else if (branch.branch) {
          branchesData.push({
            id: branch.branch.id,
            name: branch.branch.name,
          });
        }
        // Para o caso onde temos apenas TherapyPlanBranch sem a branch carregada
        else if (branch.branchId) {
          // Aqui idealmente buscaríamos os detalhes da filial, mas para simplificar
          // vamos apenas usar o ID
          branchesData.push({
            id: branch.branchId,
            name: `Filial ${branch.branchId.substring(0, 8)}...`,
          });
        }
      });
    }

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description || undefined,
      totalSessions: plan.totalSessions,
      totalPrice: plan.totalPrice,
      validityDays: plan.validityDays,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      branches: branchesData,
      subscriptionCount: plan._count?.subscriptions,
    };
  }

  /**
   * Cria um novo plano de terapia
   */
  async create(createPlanDto: CreateTherapyPlanDto): Promise<TherapyPlanDto> {
    const { branchIds, ...planData } = createPlanDto;

    try {
      // Verificar se todas as filiais existem
      const branches = await this.prisma.branch.findMany({
        where: {
          id: { in: branchIds },
          isActive: true,
        },
        select: { id: true },
      });

      if (branches.length !== branchIds.length) {
        throw new BadRequestException(
          'Uma ou mais filiais especificadas não existem ou estão inativas',
        );
      }

      // Criar o plano e associar às filiais em uma única transação
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Criar o plano
        const plan = await tx.therapyPlan.create({
          data: {
            ...planData,
            isActive: planData.isActive ?? true,
          },
        });

        // 2. Criar relações com filiais
        if (branchIds.length > 0) {
          await tx.therapyPlanBranch.createMany({
            data: branchIds.map((branchId: string) => ({
              therapyPlanId: plan.id,
              branchId,
            })),
          });
        }

        // 3. Buscar o plano completo com filiais
        return await tx.therapyPlan.findUnique({
          where: { id: plan.id },
          include: {
            branchLinks: {
              include: {
                branch: true,
              },
            },
            _count: {
              select: { subscriptions: true },
            },
          },
        });
      });

      if (!result) {
        throw new Error('Falha ao criar plano de terapia');
      }

      // Mapear para o formato padronizado
      return this.mapTherapyPlanToDto(result);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Já existe um plano com esse nome');
        }
      }
      throw error;
    }
  }

  /**
   * Lista todos os planos de terapia, opcionalmente filtrados por filial
   */
  async findAll(branchId?: string): Promise<TherapyPlanDto[]> {
    try {
      let plans: any[] = [];

      // Se houver filtro por filial, buscar apenas os planos associados a ela
      if (branchId) {
        // Verificar se a filial existe
        const branch = await this.prisma.branch.findUnique({
          where: { id: branchId },
        });

        if (!branch) {
          throw new NotFoundException(
            `Filial com ID ${branchId} não encontrada`,
          );
        }

        // Buscar planos associados a esta filial usando o método adequado do Prisma
        const result = await this.prisma.$queryRaw`
          SELECT tp.* FROM "TherapyPlan" tp
          JOIN "TherapyPlanBranch" tpb ON tp.id = tpb."therapyPlanId"
          WHERE tpb."branchId" = ${branchId}
        `;
        
        plans = Array.isArray(result) ? result : [];
      } else {
        // Buscar todos os planos com suas filiais
        const result = await this.prisma.$queryRaw`
          SELECT tp.*, 
            (SELECT COUNT(*) FROM "Subscription" s WHERE s."therapyPlanId" = tp.id) as "subscriptionCount"
          FROM "TherapyPlan" tp
          ORDER BY tp."createdAt" DESC
        `;
        
        plans = Array.isArray(result) ? result : [];
        
        // Para cada plano, buscar suas filiais
        for (const plan of plans) {
          const branches = await this.prisma.$queryRaw`
            SELECT b.id, b.name FROM "Branch" b
            JOIN "TherapyPlanBranch" tpb ON b.id = tpb."branchId"
            WHERE tpb."therapyPlanId" = ${plan.id}
          `;
          
          plan.branchLinks = Array.isArray(branches) 
            ? branches.map((b: any) => ({ branch: b })) 
            : [];
        }
      }

      // Mapear para o formato padronizado
      return plans.map((plan) => this.mapTherapyPlanToDto(plan));
    } catch (error) {
      console.error('Erro ao listar planos:', error);
      throw error;
    }
  }

  /**
   * Busca um plano específico pelo ID
   */
  async findOne(id: string): Promise<TherapyPlanDto> {
    try {
      // Buscar plano pelo ID
      const plan = await this.prisma.$queryRaw`
        SELECT tp.* FROM "TherapyPlan" tp WHERE tp.id = ${id}
      `;

      if (!plan || !Array.isArray(plan) || plan.length === 0) {
        throw new NotFoundException(
          `Plano de terapia com ID ${id} não encontrado`,
        );
      }

      const therapyPlan = plan[0];

      // Buscar filiais associadas
      const branches = await this.prisma.$queryRaw`
        SELECT b.id, b.name FROM "Branch" b
        JOIN "TherapyPlanBranch" tpb ON b.id = tpb."branchId"
        WHERE tpb."therapyPlanId" = ${id}
      `;

      // Buscar contagem de subscrições
      const subscriptionCount = await this.prisma.$queryRaw`
        SELECT COUNT(*) FROM "Subscription" s WHERE s."therapyPlanId" = ${id}
      `;
      
      therapyPlan.branchLinks = Array.isArray(branches) 
        ? branches.map((b: any) => ({ branch: b })) 
        : [];
      
      therapyPlan._count = { 
        subscriptions: Array.isArray(subscriptionCount) && subscriptionCount.length > 0
          ? Number(subscriptionCount[0].count)
          : 0
      };

      return this.mapTherapyPlanToDto(therapyPlan);
    } catch (error) {
      console.error(`Erro ao buscar plano ${id}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza um plano existente
   */
  async update(
    id: string,
    updatePlanDto: UpdateTherapyPlanDto,
  ): Promise<TherapyPlanDto> {
    // Verificar se o plano existe
    const existingPlan = await this.findOne(id);

    const { branchIds, ...planData } = updatePlanDto;

    try {
      // Se branchIds foi fornecido, verificar se as filiais existem
      if (branchIds && branchIds.length > 0) {
        const branches = await this.prisma.branch.findMany({
          where: {
            id: { in: branchIds },
            isActive: true,
          },
          select: { id: true },
        });

        if (branches.length !== branchIds.length) {
          throw new BadRequestException(
            'Uma ou mais filiais especificadas não existem ou estão inativas',
          );
        }
      }

      // Atualizar o plano
      await this.prisma.$executeRaw`
        UPDATE "TherapyPlan"
        SET 
          "name" = ${planData.name || existingPlan.name},
          "description" = ${planData.description !== undefined ? planData.description : existingPlan.description},
          "totalSessions" = ${planData.totalSessions || existingPlan.totalSessions},
          "totalPrice" = ${planData.totalPrice || existingPlan.totalPrice},
          "validityDays" = ${planData.validityDays || existingPlan.validityDays},
          "isActive" = ${planData.isActive !== undefined ? planData.isActive : existingPlan.isActive},
          "updatedAt" = ${new Date()}
        WHERE id = ${id}
      `;

      // Se branchIds foi fornecido, atualizar as associações
      if (branchIds) {
        // Remover associações existentes
        await this.prisma.$executeRaw`
          DELETE FROM "TherapyPlanBranch"
          WHERE "therapyPlanId" = ${id}
        `;

        // Criar novas associações
        if (branchIds.length > 0) {
          for (const branchId of branchIds) {
            await this.prisma.$executeRaw`
              INSERT INTO "TherapyPlanBranch" ("id", "therapyPlanId", "branchId", "createdAt")
              VALUES (${Prisma.raw('gen_random_uuid()')}, ${id}, ${branchId}, ${new Date()})
            `;
          }
        }
      }

      // Retornar o plano atualizado
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Já existe um plano com esse nome');
        }
      }
      throw error;
    }
  }

  /**
   * Remove um plano existente
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    // Verificar se o plano existe
    await this.findOne(id);

    // Verificar se há assinaturas ativas para este plano
          const activeSubscriptionsResult = await this.prisma.$queryRaw<Array<{count: string}>>`
      SELECT COUNT(*) FROM "Subscription"
      WHERE "therapyPlanId" = ${id} AND "status" = 'ACTIVE'
    `;
    
    const activeSubscriptions = Number(activeSubscriptionsResult[0]?.count || 0);

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        `Não é possível excluir o plano pois existem ${activeSubscriptions} assinaturas ativas`,
      );
    }

    // Remover em transação
    await this.prisma.$transaction(async (tx) => {
      // Remover todas as associações com filiais
      await this.prisma.$executeRaw`
        DELETE FROM "TherapyPlanBranch" WHERE "therapyPlanId" = ${id}
      `;
      // Remover o plano
      await this.prisma.$executeRaw`
        DELETE FROM "TherapyPlan" WHERE id = ${id}
      `;
    });

    return {
      success: true,
      message: `Plano com ID ${id} removido com sucesso`,
    };
  }

  /**
   * Adiciona uma filial a um plano de terapia
   * @param planId ID do plano
   * @param branchId ID da filial
   */
  async addBranchToPlan(
    planId: string,
    branchId: string,
  ): Promise<TherapyPlanDto> {
    try {
      // Verificar se o plano existe
      await this.findOne(planId);

      // Verificar se a filial existe
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        throw new NotFoundException(`Filial com ID ${branchId} não encontrada`);
      }

      // Verificar se a associação já existe
      const existingLinkResult = await this.prisma.$queryRaw`
        SELECT id FROM "TherapyPlanBranch"
        WHERE "therapyPlanId" = ${planId} AND "branchId" = ${branchId}
      `;
      
      const existingLink = Array.isArray(existingLinkResult) && existingLinkResult.length > 0
        ? existingLinkResult[0]
        : null;

      if (existingLink) {
        throw new BadRequestException(
          `Essa filial já está associada a este plano`,
        );
      }

      // Criar a associação
      await this.prisma.$executeRaw`
        INSERT INTO "TherapyPlanBranch" ("id", "therapyPlanId", "branchId", "createdAt")
        VALUES (${Prisma.raw('gen_random_uuid()')}, ${planId}, ${branchId}, ${new Date()})
      `;

      // Retornar o plano atualizado
      return this.findOne(planId);
    } catch (error) {
      console.error(
        `Erro ao adicionar filial ${branchId} ao plano ${planId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove uma filial de um plano de terapia
   * @param planId ID do plano
   * @param branchId ID da filial
   */
  async removeBranchFromPlan(
    planId: string,
    branchId: string,
  ): Promise<TherapyPlanDto> {
    try {
      // Buscar o plano com suas filiais
      const plan = await this.findOne(planId);
      
      // Verificar se a associação existe
      const existingLinkResult = await this.prisma.$queryRaw`
        SELECT id FROM "TherapyPlanBranch"
        WHERE "therapyPlanId" = ${planId} AND "branchId" = ${branchId}
      `;
      
      const existingLink = Array.isArray(existingLinkResult) && existingLinkResult.length > 0
        ? existingLinkResult[0]
        : null;

      if (!existingLink) {
        throw new BadRequestException(
          `Essa filial não está associada a este plano`,
        );
      }

      // Verificar se é a última filial
      if (plan.branches.length <= 1) {
        throw new BadRequestException(
          `Não é possível remover a última filial. O plano deve ter pelo menos uma filial associada.`,
        );
      }

      // Remover a associação
      await this.prisma.$executeRaw`
        DELETE FROM "TherapyPlanBranch" 
        WHERE id = ${existingLink.id}
      `;

      // Retornar o plano atualizado
      return this.findOne(planId);
    } catch (error) {
      console.error(
        `Erro ao remover filial ${branchId} do plano ${planId}:`,
        error,
      );
      throw error;
    }
  }
}
 