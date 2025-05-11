import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTherapyPlanDto } from './dto/create-plan.dto';
import { UpdateTherapyPlanDto } from './dto/update-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { addDays } from 'date-fns';

// Definir explicitamente o enum
enum SubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED'
}

@Injectable()
export class TherapyPlansService {
  constructor(private prisma: PrismaService) {}

  // GERENCIAMENTO DE PLANOS

  async create(createPlanDto: CreateTherapyPlanDto) {
    return this.prisma.therapyPlan.create({
      data: {
        ...createPlanDto,
        isActive: createPlanDto.isActive ?? true,
      },
    });
  }

  async findAll(branchId?: string) {
    const where = branchId ? { branchId } : {};
    return this.prisma.therapyPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.therapyPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plano com ID ${id} não encontrado`);
    }

    return plan;
  }

  async update(id: string, updatePlanDto: UpdateTherapyPlanDto) {
    // Verificar se o plano existe
    await this.findOne(id);

    return this.prisma.therapyPlan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async remove(id: string) {
    // Verificar se o plano existe
    await this.findOne(id);

    // Verificar se há assinaturas ativas para este plano
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        planId: id,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        `Não é possível excluir o plano pois existem ${activeSubscriptions} assinaturas ativas`,
      );
    }

    return this.prisma.therapyPlan.delete({
      where: { id },
    });
  }

  // GERENCIAMENTO DE SUBSCRIÇÕES

  async createSubscription(createSubDto: CreateSubscriptionDto) {
    // Buscar informações do plano
    const plan = await this.prisma.therapyPlan.findUnique({
      where: { id: createSubDto.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plano com ID ${createSubDto.planId} não encontrado`);
    }

    if (!plan.isActive) {
      throw new BadRequestException('Este plano não está disponível para compra');
    }

    // Verificar se o cliente existe
    const client = await this.prisma.user.findUnique({
      where: { id: createSubDto.clientId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${createSubDto.clientId} não encontrado`);
    }

    // Configurar período de validade do token (7 dias)
    const tokenExpiresAt = addDays(new Date(), 7);
    
    // Criar a subscrição
    const subscription = await this.prisma.subscription.create({
      data: {
        planId: createSubDto.planId,
        clientId: createSubDto.clientId,
        branchId: createSubDto.branchId,
        token: uuidv4(), // Gera um token único
        tokenExpiresAt,
        status: SubscriptionStatus.PENDING,
        sessionsLeft: plan.totalSessions,
      },
    });

    // Aqui poderia enviar e-mail para o cliente com o link de aceitação
    // const acceptLink = `https://seusite.com/subscribe/accept?token=${subscription.token}`;
    // await this.emailService.sendSubscriptionEmail(client.email, acceptLink);

    return subscription;
  }

  async acceptSubscription(token: string) {
    // Buscar subscrição pelo token
    const subscription = await this.prisma.subscription.findUnique({
      where: { token },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Token de subscrição inválido');
    }

    // Verificar se o token expirou
    if (new Date() > subscription.tokenExpiresAt) {
      // Atualizar o status para EXPIRED
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      throw new BadRequestException('O token de aceitação expirou');
    }

    // Verificar se a subscrição já foi aceita ou expirada
    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException(`A subscrição já está ${subscription.status}`);
    }

    // Calcular data de validade
    const validUntil = addDays(new Date(), subscription.plan.validityDays);

    // Atualizar subscrição como aceita
    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        acceptedAt: new Date(),
        validUntil,
      },
    });

    // Criar transação financeira pela venda do plano
    await this.prisma.financialTransaction.create({
      data: {
        type: 'REVENUE',
        amount: subscription.plan.totalPrice,
        description: `Venda de plano: ${subscription.plan.name}`,
        category: 'PLAN_SALE',
        date: new Date(),
        clientId: subscription.clientId,
        branchId: subscription.branchId,
        reference: subscription.id,
        referenceType: 'subscription',
      },
    });

    return updatedSubscription;
  }

  async findAllSubscriptions(
    clientId?: string,
    status?: string,
    branchId?: string,
  ) {
    // Construir a consulta dinamicamente
    const where: any = {};
    
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;

    return this.prisma.subscription.findMany({
      where,
      include: {
        plan: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: { consumptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSubscription(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        consumptions: {
          include: {
            appointment: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscrição com ID ${id} não encontrada`);
    }

    return subscription;
  }

  async cancelSubscription(id: string, reason: string) {
    const subscription = await this.findSubscription(id);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `Não é possível cancelar uma subscrição com status ${subscription.status}`,
      );
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancellationReason: reason,
      },
    });
  }

  // Método para verificar e atualizar subscrições expiradas (pode ser executado por um cron job)
  async checkExpiredSubscriptions() {
    const now = new Date();
    
    // Buscar subscrições ativas com data de validade expirada
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        validUntil: {
          lt: now,
        },
      },
    });

    // Atualizar status para EXPIRED
    for (const subscription of expiredSubscriptions) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    }

    return { expiredCount: expiredSubscriptions.length };
  }
} 