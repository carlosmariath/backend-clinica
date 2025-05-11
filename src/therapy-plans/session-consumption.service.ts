import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { differenceInHours } from 'date-fns';

// Defina os enums explicitamente
enum SubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED'
}

enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW'
}

@Injectable()
export class SessionConsumptionService {
  constructor(private prisma: PrismaService) {}

  // Consumir uma sessão quando um agendamento é confirmado
  async consumeSession(appointmentId: string) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        branch: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${appointmentId} não encontrado`);
    }

    // Verificar se o agendamento já tem um consumo associado
    const existingConsumption = await this.prisma.sessionConsumption.findUnique({
      where: { appointmentId },
    });

    if (existingConsumption) {
      throw new BadRequestException(`Este agendamento já possui um consumo de sessão associado`);
    }

    // Buscar a subscrição ACTIVE mais antiga do cliente
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        clientId: appointment.clientId,
        status: SubscriptionStatus.ACTIVE,
        sessionsLeft: { gt: 0 },
      },
      orderBy: {
        acceptedAt: 'asc',
      },
      include: {
        plan: true,
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException(
        `O cliente não possui planos ativos com sessões disponíveis`,
      );
    }

    // Verificar se há um branchId válido
    const branchId = appointment.branchId || '2e65c193-e010-4a5d-9c91-2aa8c5935c99'; // ID da filial padrão
    
    // Usar transação para garantir atomicidade
    return this.prisma.$transaction(async (prisma) => {
      // Criar o consumo de sessão
      const consumption = await prisma.sessionConsumption.create({
        data: {
          subscriptionId: activeSubscription.id,
          appointmentId,
          branchId, // Usar o branchId do appointment ou o padrão
          consumedAt: new Date(),
        },
      });

      // Decrementar o contador de sessões restantes
      const updatedSubscription = await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          sessionsLeft: activeSubscription.sessionsLeft - 1,
          // Se chegar a zero, mudar o status para COMPLETED
          ...(activeSubscription.sessionsLeft === 1
            ? { status: SubscriptionStatus.COMPLETED }
            : {}),
        },
      });

      // Criar transação financeira para a sessão
      const sessionPrice = activeSubscription.plan.totalPrice / activeSubscription.plan.totalSessions;
      
      await prisma.financialTransaction.create({
        data: {
          type: 'REVENUE',
          amount: sessionPrice,
          description: `Consumo de sessão - ${activeSubscription.plan.name}`,
          category: 'SESSION_CONSUMPTION',
          date: new Date(),
          clientId: appointment.clientId,
          branchId: appointment.branchId,
          reference: consumption.id,
          referenceType: 'consumption',
        },
      });

      return {
        consumption,
        subscription: updatedSubscription,
        sessionPrice,
      };
    });
  }

  // Verificar se um cancelamento deve consumir sessão (se for com menos de 24h de antecedência)
  async handleCancelation(appointmentId: string, applyNoShowFee: boolean = false) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        consumption: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${appointmentId} não encontrado`);
    }

    // Se o agendamento não tiver consumo, não há o que fazer
    if (!appointment.consumption) {
      return { message: 'Este agendamento não tinha consumo de sessão para processar' };
    }

    // Calculando a diferença de horas entre agora e a data do agendamento
    const hoursUntilAppointment = differenceInHours(
      new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.startTime}`),
      new Date(),
    );

    // Se o cancelamento for com 24h ou mais de antecedência, estornar o consumo
    if (hoursUntilAppointment >= 24) {
      return this.refundConsumption(appointment.consumption.id, 'Cancelamento com antecedência');
    } 
    // Se for com menos de 24h, manter o consumo e possivelmente aplicar taxa de no-show
    else if (applyNoShowFee) {
      const noShowFee = appointment.noShowFee || 50; // Taxa padrão de 50 se não especificada
      
      // Atualizar status para NO_SHOW
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { 
          status: AppointmentStatus.NO_SHOW,
          noShowFee,
        },
      });

      // Criar transação de receita pela taxa de no-show
      await this.prisma.financialTransaction.create({
        data: {
          type: 'REVENUE',
          amount: noShowFee,
          description: 'Taxa de não comparecimento (no-show)',
          category: 'NO_SHOW_FEE',
          date: new Date(),
          clientId: appointment.clientId,
          branchId: appointment.branchId,
          reference: appointmentId,
          referenceType: 'appointment',
        },
      });

      return { 
        message: 'Cancelamento com menos de 24h de antecedência - consumo mantido e taxa de no-show aplicada',
        noShowFee,
      };
    } else {
      // Só cancelar sem aplicar taxa
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CANCELED },
      });

      return { 
        message: 'Cancelamento com menos de 24h de antecedência - consumo mantido sem taxa de no-show',
      };
    }
  }

  // Estornar um consumo de sessão
  async refundConsumption(consumptionId: string, reason: string) {
    // Buscar o consumo
    const consumption = await this.prisma.sessionConsumption.findUnique({
      where: { id: consumptionId },
      include: {
        subscription: true,
        appointment: true,
      },
    });

    if (!consumption) {
      throw new NotFoundException(`Consumo com ID ${consumptionId} não encontrado`);
    }

    if (consumption.wasRefunded) {
      throw new BadRequestException('Este consumo já foi estornado');
    }

    // Usar transação para garantir atomicidade
    return this.prisma.$transaction(async (prisma) => {
      // Marcar o consumo como estornado
      await prisma.sessionConsumption.update({
        where: { id: consumptionId },
        data: {
          wasRefunded: true,
          refundReason: reason,
        },
      });

      // Incrementar o contador de sessões restantes na subscrição
      const subscription = await prisma.subscription.findUnique({
        where: { id: consumption.subscriptionId },
        include: { plan: true },
      });

      // Verificar se a subscrição ainda está válida ou se já expirou
      const canRefundSession = subscription && (
        subscription.status === SubscriptionStatus.ACTIVE || 
        (subscription.status === SubscriptionStatus.COMPLETED && subscription.sessionsLeft === 0)
      );

      if (subscription && canRefundSession) {
        await prisma.subscription.update({
          where: { id: consumption.subscriptionId },
          data: {
            sessionsLeft: { increment: 1 },
            // Se estiver COMPLETED, voltar para ACTIVE
            status: subscription && subscription.status === SubscriptionStatus.COMPLETED 
              ? SubscriptionStatus.ACTIVE 
              : undefined,
          },
        });
      }

      // Atualizar o status do agendamento
      await prisma.appointment.update({
        where: { id: consumption.appointmentId },
        data: { status: AppointmentStatus.CANCELED },
      });

      // Criar transação financeira de estorno
      if (subscription && subscription.plan) {
        const sessionPrice = subscription.plan.totalPrice / subscription.plan.totalSessions;
        
        await prisma.financialTransaction.create({
          data: {
            type: 'EXPENSE',
            amount: sessionPrice,
            description: `Estorno de sessão - ${reason}`,
            category: 'SESSION_REFUND',
            date: new Date(),
            clientId: consumption.appointment.clientId,
            branchId: consumption.appointment.branchId,
            reference: consumptionId,
            referenceType: 'consumption_refund',
          },
        });
      }

      return {
        message: 'Consumo estornado com sucesso',
        canRefundSession,
        sessionPrice: subscription && subscription.plan 
          ? subscription.plan.totalPrice / subscription.plan.totalSessions 
          : null,
      };
    });
  }

  // Reagendar um agendamento (manter o mesmo consumo)
  async rescheduleAppointment(appointmentId: string, newDate: Date, newStartTime: string, newEndTime: string) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        consumption: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${appointmentId} não encontrado`);
    }

    // Atualizar o agendamento
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        status: AppointmentStatus.PENDING, // Voltar para PENDING
      },
    });

    return {
      message: 'Agendamento remarcado com sucesso',
      hasConsumption: !!appointment.consumption,
      appointment: updatedAppointment,
    };
  }
} 