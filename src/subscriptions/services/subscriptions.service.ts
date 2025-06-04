import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { SubscriptionDto } from '../dto/subscription.dto';
import { ConsumptionDetailDto } from '../dto/consumption-detail.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca todas as assinaturas com filtros opcionais e paginação
   */
  async findAll(
    clientId?: string,
    status?: string,
    branchIds?: string | string[],
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: SubscriptionDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    // Constrói o where com os filtros opcionais
    const where: any = {};
    
    if (clientId) {
      where.clientId = clientId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (branchIds) {
      // Se for um array de filiais, usa o operador IN do Prisma
      if (Array.isArray(branchIds)) {
        where.branchId = {
          in: branchIds
        };
      } else {
        // Retrocompatibilidade para filtro de uma única filial
        where.branchId = branchIds;
      }
    }
    
    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true }
          },
          therapyPlan: {
            select: { 
              id: true, 
              name: true, 
              description: true, 
              totalSessions: true, 
              totalPrice: true, 
              validityDays: true 
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      this.prisma.subscription.count({ where })
    ]);
    
    return {
      data: subscriptions as SubscriptionDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Busca uma assinatura pelo ID
   */
  async findOne(id: string): Promise<SubscriptionDto | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        client: true,
        therapyPlan: true
      }
    });
    
    if (!subscription) {
      return null;
    }
    
    return subscription as SubscriptionDto;
  }

  /**
   * Cria uma nova assinatura
   */
  async create(createDto: CreateSubscriptionDto): Promise<SubscriptionDto> {
    // Buscar o plano para obter informações como duração e número de sessões
    const therapyPlan = await this.prisma.therapyPlan.findUnique({
      where: { id: createDto.planId }
    });
    
    if (!therapyPlan) {
      throw new NotFoundException(`Plano de terapia com ID ${createDto.planId} não encontrado`);
    }
    
    // Calcular a data de término com base na data atual e na duração do plano
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + therapyPlan.validityDays);
    
    // Criar a assinatura
    const subscription = await this.prisma.subscription.create({
      data: {
        clientId: createDto.clientId,
        therapyPlanId: createDto.planId,
        branchId: createDto.branchId,
        startDate,
        endDate,
        status: 'ACTIVE',
        totalSessions: therapyPlan.totalSessions,
        remainingSessions: therapyPlan.totalSessions,
      },
      include: {
        client: true,
        therapyPlan: true
      }
    });
    
    return subscription as SubscriptionDto;
  }

  /**
   * Cancela uma assinatura existente
   */
  async cancel(id: string): Promise<SubscriptionDto> {
    // Verificar se a assinatura existe
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!existingSubscription) {
      throw new NotFoundException(`Assinatura com ID ${id} não encontrada`);
    }
    
    // Atualizar o status para CANCELED
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELED',
        // Atualizar a data de término para a data atual
        endDate: new Date()
      },
      include: {
        client: true,
        therapyPlan: true
      }
    });
    
    return subscription as SubscriptionDto;
  }

  /**
   * Remove uma assinatura existente
   */
  async remove(id: string): Promise<void> {
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!existingSubscription) {
      throw new NotFoundException(`Assinatura com ID ${id} não encontrada`);
    }
    
    // Primeiro, remover qualquer histórico de consumo associado
    await this.prisma.subscriptionConsumption.deleteMany({
      where: { subscriptionId: id }
    });
    
    // Depois, remover a assinatura
    await this.prisma.subscription.delete({
      where: { id }
    });
  }

  /**
   * Obtém o histórico de consumo de uma assinatura
   */
  async getConsumptionHistory(subscriptionId: string): Promise<ConsumptionDetailDto[]> {
    // Verificar se a assinatura existe
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });
    
    if (!existingSubscription) {
      throw new NotFoundException(`Assinatura com ID ${subscriptionId} não encontrada`);
    }
    
    // Buscar o histórico de consumo
    const consumptionHistory = await this.prisma.subscriptionConsumption.findMany({
      where: { subscriptionId },
      orderBy: {
        consumedAt: 'desc'
      }
    });
    
    return consumptionHistory as ConsumptionDetailDto[];
  }
} 