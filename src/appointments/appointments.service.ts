import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';
import { SessionConsumptionService } from '../therapy-plans/session-consumption.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private sessionConsumptionService: SessionConsumptionService,
  ) {}

  // Função utilitária para converter string de data para Date sem problemas de timezone
  private parseDateString(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Função utilitária para calcular o dia da semana corretamente
  private getDayOfWeekFromDateString(dateString: string): number {
    // Parse manual da data para evitar problemas de timezone
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Criar data em UTC meia-noite
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Meio-dia UTC para evitar edge cases
    
    // Aplicar offset do timezone de São Paulo (-3 horas)
    const saoPauloOffset = -3 * 60; // -3 horas em minutos
    const saoPauloDate = new Date(date.getTime() + saoPauloOffset * 60 * 1000);
    
    // Retorna 1-7 (Segunda-Domingo) - mesmo formato do therapists.service.ts
    return saoPauloDate.getUTCDay() + 1 == 8 ? 0 : saoPauloDate.getUTCDay() + 1;
  }

  async createAppointment(params: {
    clientId: string;
    therapistId: string;
    serviceId?: string;
    date: string;
    startTime: string;
    endTime: string;
    branchId?: string;
    subscriptionId?: string;
    notes?: string;
  }) {
    console.log('createAppointment - Parâmetros recebidos:', params);

    const { clientId, therapistId, serviceId, date, startTime, endTime, branchId, subscriptionId, notes } = params;

    // 1. Verificar se o terapeuta tem schedule para o dia da semana e horário
    const dayOfWeek = this.getDayOfWeekFromDateString(date);
    console.log('createAppointment - Dia da semana calculado:', dayOfWeek);

    const therapistAvailability = await this.prisma.schedule.findFirst({
      where: {
        therapistId,
        dayOfWeek,
        startTime: { lte: startTime },
        endTime: { gte: endTime },
      },
    });

    console.log('createAppointment - Disponibilidade encontrada:', therapistAvailability);

    if (!therapistAvailability) {
      console.log('createAppointment - ERRO: Terapeuta não disponível neste horário');
      
      // Debug: listar todos os horários do terapeuta para debug
      const allSchedules = await this.prisma.schedule.findMany({
        where: { therapistId },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      });
      console.log('createAppointment - Todos os horários do terapeuta:', allSchedules);
      
      throw new BadRequestException(
        'O terapeuta não está disponível neste horário.',
      );
    }

    // 2. Verificar se já existe agendamento para o terapeuta nesse horário e data
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        therapistId,
        date: this.parseDateString(date),
        OR: [
          {
            startTime: {
              lte: endTime,
            },
            endTime: {
              gt: startTime,
            },
          },
        ],
      },
    });
    if (conflictingAppointment) {
      throw new BadRequestException(
        'Já existe um agendamento para esse terapeuta nesse horário.',
      );
    }

    // 3. Verificar se já existe agendamento para o cliente nesse horário e data
    const conflictingClientAppointment = await this.prisma.appointment.findFirst({
      where: {
        clientId,
        date: this.parseDateString(date),
        OR: [
          {
            startTime: { lte: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    });
    if (conflictingClientAppointment) {
      throw new BadRequestException(
        'O cliente já possui um agendamento nesse horário.',
      );
    }

    // Se não foi fornecido branchId, obter da terapeuta
    let finalBranchId = branchId;
    if (!finalBranchId) {
      const therapistBranch = await this.prisma.therapistBranch.findFirst({
        where: { therapistId },
        select: { branchId: true },
      });
      finalBranchId = therapistBranch?.branchId || undefined;
    }

    // 4. Criar o agendamento
    const appointmentData: any = {
      clientId,
      therapistId,
      date: this.parseDateString(date),
      startTime,
      endTime,
      status: 'PENDING',
    };

    if (serviceId) {
      appointmentData.serviceId = serviceId;
    }

    if (finalBranchId) {
      appointmentData.branchId = finalBranchId;
    }

    if (notes) {
      appointmentData.notes = notes;
    }

    const appointment = await this.prisma.appointment.create({ 
      data: appointmentData,
      include: {
        client: true,
        therapist: true,
        service: true,
        branch: true,
      }
    });

    // 5. Se foi fornecido subscriptionId, tentar consumir uma sessão
    if (subscriptionId) {
      try {
        const consumptionResult = await this.sessionConsumptionService.consumeSessionForAppointment(
          subscriptionId,
          appointment.id,
          finalBranchId
        );
        
        console.log('createAppointment - Sessão consumida:', consumptionResult);
        
        return {
          ...appointment,
          consumption: consumptionResult,
          message: 'Agendamento criado e sessão consumida com sucesso'
        };
      } catch (error) {
        console.log('createAppointment - Erro ao consumir sessão:', error.message);
        
        return {
          ...appointment,
          message: 'Agendamento criado sem consumo de sessão: ' + error.message
        };
      }
    }

    return appointment;
  }

  async listAppointmentsByClient(clientId: string, branchId?: string) {
    const where: any = { clientId };
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        therapist: true,
        service: {
          select: { id: true, name: true, description: true, price: true, averageDuration: true }
        },
        branch: true,
      },
    });
  }

  async listAppointmentsByTherapist(therapistId: string, branchId?: string) {
    const where: any = { therapistId };
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        client: true,
        service: {
          select: { id: true, name: true, description: true, price: true, averageDuration: true }
        },
        branch: true,
      },
    });
  }

  async getAvailableDates({
    services,
    therapistId,
    month,
    branchId,
  }: {
    services: string;
    therapistId: string;
    month: string;
    branchId?: string;
  }) {
    // Validar se o month foi fornecido
    if (!month) {
      throw new BadRequestException('O parâmetro "month" é obrigatório no formato YYYY-MM');
    }

    // Validar formato do month
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('O parâmetro "month" deve estar no formato YYYY-MM');
    }

    // Implementação simples para retornar uma array de datas disponíveis
    const [year, monthNum] = month.split('-').map(Number);

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0); // Último dia do mês

    const dates: Date[] = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      // Considerar apenas dias úteis (não domingos)
      // Usar a mesma lógica de cálculo de dia da semana
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = this.getDayOfWeekFromDateString(dateStr);
      if (dayOfWeek !== 0) { // 0 = domingo no formato 1-7
        dates.push(new Date(d));
      }
    }

    return {
      dates: dates.map((date) => ({
        date: date.toISOString().split('T')[0],
        available: true,
      })),
    };
  }

  async getAvailableSlots({
    services,
    therapistId,
    date,
    branchId,
  }: {
    services: string;
    therapistId: string;
    date: string;
    branchId?: string;
  }) {
    // Validar parâmetros obrigatórios
    if (!date) {
      throw new BadRequestException('O parâmetro "date" é obrigatório no formato YYYY-MM-DD');
    }

    if (!therapistId) {
      throw new BadRequestException('O parâmetro "therapistId" é obrigatório');
    }

    // Validar formato da data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('O parâmetro "date" deve estar no formato YYYY-MM-DD');
    }

    // Implementação simples para retornar slots disponíveis
    // Na prática, verificaria agendamentos existentes e disponibilidade do terapeuta
    const timeSlots = [
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
    ];

    return {
      slots: timeSlots.map((time) => ({
        time,
        available: true,
      })),
    };
  }

  async getAvailableTimes(
    date: string,
  ): Promise<{ time: string; therapists: { id: string; name: string }[] }[]> {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Data inválida fornecida: ${date}`);
    }

    // Usar a mesma lógica de cálculo de dia da semana
    const dayOfWeek = this.getDayOfWeekFromDateString(date);

    // 🔹 Buscar todas as disponibilidades das terapeutas para esse dia
    const allSchedules = await this.prisma.schedule.findMany({
      where: { dayOfWeek },
      select: {
        startTime: true,
        endTime: true,
        therapist: { select: { id: true, name: true } },
      },
    });

    if (!allSchedules.length) {
      return [];
    }

    // 🔹 Criar um mapa de horários disponíveis
    const availableTimesMap = new Map<
      string,
      Set<{ id: string; name: string }>
    >();

    allSchedules.forEach(({ startTime, endTime, therapist }) => {
      let currentTime = parseInt(startTime.replace(':', ''), 10);
      const endTimeInt = parseInt(endTime.replace(':', ''), 10);

      while (currentTime < endTimeInt) {
        const formattedTime = `${String(Math.floor(currentTime / 100)).padStart(2, '0')}:00`;

        if (!availableTimesMap.has(formattedTime)) {
          availableTimesMap.set(formattedTime, new Set());
        }

        availableTimesMap
          .get(formattedTime)
          ?.add({ id: therapist.id, name: therapist.name });

        currentTime += 100; // Avança 1 hora
      }
    });

    // 🔹 Buscar todos os atendimentos agendados para essa data
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lt: new Date(`${date}T23:59:59.999Z`),
        },
      },
      select: { startTime: true, therapistId: true },
    });

    // 🔹 Criar um mapa de horários ocupados por terapeuta
    const bookedTimesMap = new Map<string, Set<string>>();

    bookedAppointments.forEach(({ startTime, therapistId }) => {
      if (!bookedTimesMap.has(startTime)) {
        bookedTimesMap.set(startTime, new Set());
      }
      bookedTimesMap.get(startTime)?.add(therapistId);
    });

    // 🔹 Remover terapeutas ocupados dos horários disponíveis
    bookedTimesMap.forEach((therapistIds, startTime) => {
      if (availableTimesMap.has(startTime)) {
        const therapists = availableTimesMap.get(startTime);
        therapistIds.forEach((therapistId) =>
          therapists?.delete({ id: therapistId, name: '' }),
        );
        if (therapists?.size === 0) {
          availableTimesMap.delete(startTime);
        }
      }
    });

    // 🔹 Retornar horários disponíveis com terapeutas
    return Array.from(availableTimesMap.entries()).map(
      ([time, therapists]) => ({
        time,
        therapists: Array.from(therapists),
      }),
    );
  }
  async findAll(branchId?: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (branchId) {
      where.branchId = branchId;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true }
          },
          therapist: {
            select: { id: true, name: true, specialty: true }
          },
          service: {
            select: { id: true, name: true, description: true, price: true, averageDuration: true }
          },
          branch: {
            select: { id: true, name: true }
          }
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where })
    ]);

    return {
      data: appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  async update(id: string, data: any) {
    return this.prisma.appointment.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.appointment.delete({ where: { id } });
  }
  async updateStatus(appointmentId: string, status: AppointmentStatus) {
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED'];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Status inválido.');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });
  }

  async listAppointmentsInRange({
    start,
    end,
    therapistId,
    clientId,
    branchId,
  }: {
    start: string;
    end: string;
    therapistId?: string;
    clientId?: string;
    branchId?: string;
  }) {
    const where: any = {
      date: {
        gte: this.parseDateString(start),
        lte: this.parseDateString(end),
      },
    };

    if (therapistId) where.therapistId = therapistId;
    if (clientId) where.clientId = clientId;
    if (branchId) where.branchId = branchId;

    return await this.prisma.appointment.findMany({
      where,
      include: {
        client: true,
        therapist: true,
        service: {
          select: { id: true, name: true, description: true, price: true, averageDuration: true }
        },
        branch: true,
      },
    });
  }

  async confirmAppointment(id: string) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
    }

    if (appointment.status === AppointmentStatus.CONFIRMED) {
      return { message: 'Este agendamento já está confirmado' };
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException(
        `Não é possível confirmar um agendamento com status ${appointment.status}`,
      );
    }

    // Atualizar o status do agendamento para CONFIRMED
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
    });

    // Tentar consumir uma sessão do plano do cliente
    try {
      const consumptionResult =
        await this.sessionConsumptionService.consumeSession(id);
      return {
        appointment: updatedAppointment,
        consumptionResult,
        message: 'Agendamento confirmado e sessão consumida com sucesso',
      };
    } catch (error) {
      // Se não for possível consumir, apenas confirmar o agendamento sem consumo
      return {
        appointment: updatedAppointment,
        message:
          'Agendamento confirmado sem consumo de sessão: ' + error.message,
      };
    }
  }

  async cancelAppointment(id: string, applyNoShowFee: boolean = false) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
    }

    if (appointment.status === AppointmentStatus.CANCELED) {
      return { message: 'Este agendamento já está cancelado' };
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Não é possível cancelar um agendamento já realizado',
      );
    }

    // Verificar se há consumo de sessão associado a este agendamento
    // e aplicar as regras de cancelamento
    try {
      const cancellationResult =
        await this.sessionConsumptionService.handleCancelation(
          id,
          applyNoShowFee,
        );

      // O método handleCancelation já atualiza o status para CANCELED ou NO_SHOW
      // quando necessário, então não precisamos fazer a atualização aqui

      return {
        message: 'Agendamento cancelado com sucesso',
        cancellationResult,
      };
    } catch (error) {
      // Se não encontrar consumo associado ou ocorrer outro erro,
      // apenas atualizar o status para CANCELED
      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELED },
      });

      return {
        appointment: updatedAppointment,
        message:
          'Agendamento cancelado sem processamento de consumo: ' +
          error.message,
      };
    }
  }

  async rescheduleAppointment(
    id: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) {
    // Verificar se o agendamento existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
    }

    // Verificar se o horário está disponível
    const isAvailable = await this.checkAvailability(
      appointment.therapistId,
      new Date(newDate),
      newStartTime,
      newEndTime,
      appointment.id, // Ignorar o próprio agendamento na verificação
    );

    if (!isAvailable) {
      throw new BadRequestException(
        'O horário selecionado não está disponível',
      );
    }

    // Se houver consumo de sessão associado, usar o serviço de consumo para reagendar
    try {
      const reschedulingResult =
        await this.sessionConsumptionService.rescheduleAppointment(
          id,
          new Date(newDate),
          newStartTime,
          newEndTime,
        );

      return {
        message: 'Agendamento remarcado com sucesso',
        reschedulingResult,
      };
    } catch (error) {
      // Se não encontrar consumo associado ou ocorrer outro erro,
      // apenas atualizar o agendamento
      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: {
          date: new Date(newDate),
          startTime: newStartTime,
          endTime: newEndTime,
          status: AppointmentStatus.PENDING, // Voltar para PENDING quando reagendado
        },
      });

      return {
        appointment: updatedAppointment,
        message:
          'Agendamento remarcado sem processamento de consumo: ' +
          error.message,
      };
    }
  }

  private async checkAvailability(
    therapistId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    // Montar filtro para buscar agendamentos conflitantes
    const where: any = {
      therapistId,
      date,
      NOT: {
        status: AppointmentStatus.CANCELED,
      },
      OR: [
        {
          // Agendamento existente começa durante o novo período
          startTime: {
            gte: startTime,
            lt: endTime,
          },
        },
        {
          // Agendamento existente termina durante o novo período
          endTime: {
            gt: startTime,
            lte: endTime,
          },
        },
        {
          // Agendamento existente engloba o novo período
          startTime: {
            lte: startTime,
          },
          endTime: {
            gte: endTime,
          },
        },
      ],
    };

    // Se estamos modificando um agendamento existente, excluí-lo da verificação
    if (excludeAppointmentId) {
      where.id = {
        not: excludeAppointmentId,
      };
    }

    // Contar agendamentos conflitantes
    const conflictCount = await this.prisma.appointment.count({ where });

    // Se não houver conflitos, o horário está disponível
    return conflictCount === 0;
  }
}
