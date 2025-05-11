import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async createAppointment(
    clientId: string,
    therapistId: string,
    date: string,
    startTime: string,
    endTime: string,
    branchId?: string,
  ) {
    // 1. Verificar se o terapeuta tem schedule para o dia da semana e horário
    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const therapistAvailability = await this.prisma.schedule.findFirst({
      where: {
        therapistId,
        dayOfWeek,
        startTime: { lte: startTime },
        endTime: { gte: endTime },
      },
    });
    if (!therapistAvailability) {
      throw new BadRequestException(
        'O terapeuta não está disponível neste horário.',
      );
    }
    // 2. Verificar se já existe agendamento para o terapeuta nesse horário e data
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        therapistId,
        date: new Date(date),
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
    const conflictingClientAppointment =
      await this.prisma.appointment.findFirst({
        where: {
          clientId,
          date: new Date(date),
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
    if (!branchId) {
      const therapistBranch = await this.prisma.therapistBranch.findFirst({
        where: { therapistId },
        select: { branchId: true },
      });
      branchId = therapistBranch?.branchId || undefined;
    }

    // 4. Criar o agendamento
    const data: any = {
      clientId,
      therapistId,
      date: new Date(date),
      startTime,
      endTime,
      status: 'PENDING',
    };

    if (branchId) {
      data.branchId = branchId;
    }

    return this.prisma.appointment.create({ data });
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
        branch: true,
      },
    });
  }

  async cancelAppointment(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment)
      throw new NotFoundException('Agendamento não encontrado.');

    if (appointment.clientId !== userId && appointment.therapistId !== userId) {
      throw new BadRequestException('Você não pode cancelar este agendamento.');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELED' },
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
    // services: string separado por vírgula
    // month: YYYY-MM
    // Retorna [{ date: string, available: boolean, slots: string[] }]
    if (!therapistId || !services) return [];
    const [year, monthNum] = month
      ? month.split('-').map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1];
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const results: { date: string; available: boolean; slots: string[] }[] = [];

    // Otimização: buscar todos os dias da semana disponíveis do terapeuta de uma vez
    const schedules = await this.prisma.schedule.findMany({
      where: { therapistId },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    });
    const availableDaysOfWeek = schedules.map((s) => s.dayOfWeek);

    // Buscar todos os agendamentos do mês de uma vez
    const monthStr = String(monthNum).padStart(2, '0');

    // Adicionar filtro por filial se fornecido
    const where: any = {
      therapistId,
      date: {
        gte: new Date(`${year}-${monthStr}-01`),
        lte: new Date(`${year}-${monthStr}-${daysInMonth}`),
      },
    };

    if (branchId) where.branchId = branchId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: { date: true, startTime: true },
    });

    // Buscar a duração média do serviço selecionado (assumindo apenas um serviço)
    const serviceId = services.split(',')[0];

    // Adicionar filtro por filial se fornecido
    const serviceWhere: any = { id: serviceId };
    if (branchId) serviceWhere.branchId = branchId;

    const service: { averageDuration: number } | null =
      await this.prisma.service.findFirst({
        where: serviceWhere,
        select: { averageDuration: true },
      });
    const duration: number =
      service && typeof service.averageDuration === 'number'
        ? service.averageDuration
        : 30;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, monthNum - 1, day));
      const dayOfWeek = dateObj.getUTCDay();
      const dateStr = dateObj.toISOString().split('T')[0];
      if (!availableDaysOfWeek.includes(dayOfWeek)) {
        results.push({ date: dateStr, available: false, slots: [] });
        continue;
      }
      // Pega o schedule do terapeuta para esse dia da semana
      const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
      if (!schedule) {
        results.push({ date: dateStr, available: false, slots: [] });
        continue;
      }
      // Gera horários possíveis para o dia usando a duração média do serviço
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const slots: string[] = [];
      for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
        const hour = String(Math.floor(m / 60)).padStart(2, '0');
        const min = String(m % 60).padStart(2, '0');
        slots.push(`${hour}:${min}`);
      }
      // Filtra agendamentos desse dia
      const booked = appointments
        .filter((a) => a.date.toISOString().split('T')[0] === dateStr)
        .map((a) => a.startTime);
      // Slots livres
      const freeSlots = slots.filter((slot) => !booked.includes(slot));
      // Se sobrar algum slot livre, o dia está disponível
      const hasFreeSlot = freeSlots.length > 0;
      results.push({ date: dateStr, available: hasFreeSlot, slots: freeSlots });
    }
    return results;
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
    // Retorna array de horários disponíveis para o terapeuta e serviço na data
    if (!therapistId || !services || !date) return [];
    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const schedule = await this.prisma.schedule.findFirst({
      where: { therapistId, dayOfWeek },
    });
    if (!schedule) return [];

    // Buscar a duração média do serviço selecionado (assumindo apenas um serviço)
    const serviceId = services.split(',')[0];

    // Adicionar filtro por filial se fornecido
    const serviceWhere: any = { id: serviceId };
    if (branchId) {
      serviceWhere.branchId = branchId;
    }

    const service = await this.prisma.service.findFirst({
      where: serviceWhere,
      select: { averageDuration: true },
    });

    const duration: number =
      service && typeof service.averageDuration === 'number'
        ? service.averageDuration
        : 30;

    // Gera horários de acordo com a duração do serviço
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const slots: string[] = [];
    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
      const hour = String(Math.floor(m / 60)).padStart(2, '0');
      const min = String(m % 60).padStart(2, '0');
      slots.push(`${hour}:${min}`);
    }
    // Remove horários já ocupados
    const appointmentWhere: any = {
      therapistId,
      date: new Date(date),
    };

    if (branchId) {
      appointmentWhere.branchId = branchId;
    }

    const appointments = await this.prisma.appointment.findMany({
      where: appointmentWhere,
    });
    const booked = appointments.map((a) => a.startTime);
    return slots.filter((slot) => !booked.includes(slot));
  }

  async getAvailableTimes(
    date: string,
  ): Promise<{ time: string; therapists: { id: string; name: string }[] }[]> {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Data inválida fornecida: ${date}`);
    }

    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(Date.UTC(year, month - 1, day));
    selectedDate.setUTCHours(12, 0, 0, 0);

    const dayOfWeek = selectedDate.getUTCDay();

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
  async findAll(branchId?: string) {
    const where: any = {};

    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        therapist: true,
        client: true,
        branch: true,
      },
    });
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
        gte: new Date(start),
        lte: new Date(end),
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
        branch: true,
      },
    });
  }
}
