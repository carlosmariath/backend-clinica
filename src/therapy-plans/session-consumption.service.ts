import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { differenceInHours } from 'date-fns';

// Defina os enums explicitamente
enum SubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
}

enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

@Injectable()
export class SessionConsumptionService {
  constructor(private prisma: PrismaService) {}

  // Consumir uma sessão de uma subscrição específica para um agendamento
  async consumeSessionForAppointment(
    subscriptionId: string,
    appointmentId: string,
    branchId?: string,
  ) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        branch: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Agendamento com ID ${appointmentId} não encontrado`,
      );
    }

    // Verificar se o agendamento já tem um consumo associado
    const existingConsumption =
      await this.prisma.subscriptionConsumption.findUnique({
        where: { appointmentId },
      });

    if (existingConsumption) {
      throw new BadRequestException(
        `Este agendamento já possui um consumo de sessão associado`,
      );
    }

    // Buscar a subscrição específica
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        therapyPlan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscrição com ID ${subscriptionId} não encontrada`,
      );
    }

    if (subscription.clientId !== appointment.clientId) {
      throw new BadRequestException(
        `Esta subscrição não pertence ao cliente do agendamento`,
      );
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `A subscrição não está ativa. Status atual: ${subscription.status}`,
      );
    }

    if (subscription.remainingSessions <= 0) {
      throw new BadRequestException(
        `A subscrição não possui sessões disponíveis`,
      );
    }

    // Verificar se há um branchId válido
    const finalBranchId =
      branchId ||
      appointment.branchId ||
      '2e65c193-e010-4a5d-9c91-2aa8c5935c99'; // ID da filial padrão

    // Usar transação para garantir atomicidade
    return this.prisma.$transaction(async (prisma) => {
      // Criar o consumo de sessão
      const consumption = await prisma.subscriptionConsumption.create({
        data: {
          subscriptionId: subscription.id,
          appointmentId,
          branchId: finalBranchId,
          consumedAt: new Date(),
        },
      });

      // Decrementar o contador de sessões restantes
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          remainingSessions: subscription.remainingSessions - 1,
          // Se chegar a zero, mudar o status para COMPLETED
          ...(subscription.remainingSessions === 1
            ? { status: SubscriptionStatus.COMPLETED }
            : {}),
        },
      });

      // Criar transação financeira para a sessão
      const sessionPrice =
        subscription.therapyPlan.totalPrice /
        subscription.therapyPlan.totalSessions;

      await prisma.financialTransaction.create({
        data: {
          type: 'REVENUE',
          amount: sessionPrice,
          description: `Consumo de sessão - ${subscription.therapyPlan.name}`,
          category: 'SESSION_CONSUMPTION',
          date: new Date(),
          clientId: appointment.clientId,
          branchId: finalBranchId,
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
      throw new NotFoundException(
        `Agendamento com ID ${appointmentId} não encontrado`,
      );
    }

    // Verificar se o agendamento já tem um consumo associado
    const existingConsumption =
      await this.prisma.subscriptionConsumption.findUnique({
        where: { appointmentId },
      });

    if (existingConsumption) {
      throw new BadRequestException(
        `Este agendamento já possui um consumo de sessão associado`,
      );
    }

    // Buscar a subscrição ACTIVE mais antiga do cliente
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        clientId: appointment.clientId,
        status: SubscriptionStatus.ACTIVE,
        remainingSessions: { gt: 0 },
      },
      orderBy: {
        startDate: 'asc',
      },
      include: {
        therapyPlan: true,
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException(
        `O cliente não possui planos ativos com sessões disponíveis`,
      );
    }

    // Verificar se há um branchId válido
    const branchId =
      appointment.branchId || '2e65c193-e010-4a5d-9c91-2aa8c5935c99'; // ID da filial padrão

    // Usar transação para garantir atomicidade
    return this.prisma.$transaction(async (prisma) => {
      // Criar o consumo de sessão
      const consumption = await prisma.subscriptionConsumption.create({
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
          remainingSessions: activeSubscription.remainingSessions - 1,
          // Se chegar a zero, mudar o status para COMPLETED
          ...(activeSubscription.remainingSessions === 1
            ? { status: SubscriptionStatus.COMPLETED }
            : {}),
        },
      });

      // Criar transação financeira para a sessão
      const sessionPrice =
        activeSubscription.therapyPlan.totalPrice /
        activeSubscription.therapyPlan.totalSessions;

      await prisma.financialTransaction.create({
        data: {
          type: 'REVENUE',
          amount: sessionPrice,
          description: `Consumo de sessão - ${activeSubscription.therapyPlan.name}`,
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
  async handleCancelation(
    appointmentId: string,
    applyNoShowFee: boolean = false,
  ) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        consumption: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Agendamento com ID ${appointmentId} não encontrado`,
      );
    }

    // Se o agendamento não tiver consumo, não há o que fazer
    if (!appointment.consumption) {
      return {
        message: 'Este agendamento não tinha consumo de sessão para processar',
      };
    }

    // Calculando a diferença de horas entre agora e a data do agendamento
    const hoursUntilAppointment = differenceInHours(
      new Date(
        `${appointment.date.toISOString().split('T')[0]}T${appointment.startTime}`,
      ),
      new Date(),
    );

    // Se o cancelamento for com 24h ou mais de antecedência, estornar o consumo
    if (hoursUntilAppointment >= 24) {
      return this.refundConsumption(
        appointment.consumption.id,
        'Cancelamento com antecedência',
      );
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
        message:
          'Cancelamento com menos de 24h de antecedência - consumo mantido e taxa de no-show aplicada',
        noShowFee,
      };
    } else {
      // Só cancelar sem aplicar taxa
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CANCELED },
      });

      return {
        message:
          'Cancelamento com menos de 24h de antecedência - consumo mantido sem taxa de no-show',
      };
    }
  }

  // Estornar um consumo de sessão
  async refundConsumption(consumptionId: string, reason: string) {
    // Buscar o consumo
    const consumption = await this.prisma.subscriptionConsumption.findUnique({
      where: { id: consumptionId },
      include: {
        subscription: true,
        appointment: true,
      },
    });

    if (!consumption) {
      throw new NotFoundException(
        `Consumo com ID ${consumptionId} não encontrado`,
      );
    }

    if (consumption.wasRefunded) {
      throw new BadRequestException('Este consumo já foi estornado');
    }

    // Usar transação para garantir atomicidade
    return this.prisma.$transaction(async (prisma) => {
      // Marcar o consumo como estornado
      await prisma.subscriptionConsumption.update({
        where: { id: consumptionId },
        data: {
          wasRefunded: true,
          refundReason: reason,
        },
      });

      // Incrementar o contador de sessões restantes na subscrição
      const subscription = await prisma.subscription.findUnique({
        where: { id: consumption.subscriptionId },
        include: { therapyPlan: true },
      });

      // Verificar se a subscrição ainda está válida ou se já expirou
      const canRefundSession =
        subscription &&
        (subscription.status === SubscriptionStatus.ACTIVE ||
          (subscription.status === SubscriptionStatus.COMPLETED &&
            subscription.remainingSessions === 0));

      if (subscription && canRefundSession) {
        await prisma.subscription.update({
          where: { id: consumption.subscriptionId },
          data: {
            remainingSessions: { increment: 1 },
            // Se estiver COMPLETED, voltar para ACTIVE
            status:
              subscription &&
              subscription.status === SubscriptionStatus.COMPLETED
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
      if (subscription && subscription.therapyPlan) {
        const sessionPrice =
          subscription.therapyPlan.totalPrice /
          subscription.therapyPlan.totalSessions;

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
        sessionPrice:
          subscription && subscription.therapyPlan
            ? subscription.therapyPlan.totalPrice /
              subscription.therapyPlan.totalSessions
            : null,
      };
    });
  }

  // Reagendar um agendamento (manter o mesmo consumo)
  async rescheduleAppointment(
    appointmentId: string,
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
  ) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        consumption: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Agendamento com ID ${appointmentId} não encontrado`,
      );
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
