import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseISO, isValid } from 'date-fns';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) { }

  async createAppointment(clientId: string, therapistId: string, date: string, startTime: string, endTime: string) {
    const therapistAvailability = await this.prisma.schedule.findFirst({
      where: {
        therapistId,
        dayOfWeek: new Date(date).getDay(),
        startTime: { lte: startTime },
        endTime: { gte: endTime },
      },
    });

    if (!therapistAvailability) {
      throw new BadRequestException('O terapeuta não está disponível neste horário.');
    }

    return this.prisma.appointment.create({
      data: { clientId, therapistId, date: new Date(date), startTime, endTime, status: 'PENDING' },
    });
  }

  async listAppointmentsByClient(clientId: string) {
    return this.prisma.appointment.findMany({ where: { clientId }, include: { therapist: true } });
  }

  async listAppointmentsByTherapist(therapistId: string) {
    return this.prisma.appointment.findMany({ where: { therapistId }, include: { client: true } });
  }

  async cancelAppointment(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });

    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');

    if (appointment.clientId !== userId && appointment.therapistId !== userId) {
      throw new BadRequestException('Você não pode cancelar este agendamento.');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELED' },
    });
  }
  async getAvailableDates(): Promise<string[]> {
    // 🔹 Busca os próximos 7 dias em que há disponibilidade
    const today = new Date();
    const futureDates: string[] = [];

    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);

      const availableTherapists = await this.prisma.schedule.findMany({
        where: { dayOfWeek: date.getDay() },
      });

      if (availableTherapists.length > 0) {
        futureDates.push(date.toISOString().split('T')[0]); // Formato YYYY-MM-DD
      }
    }

    return futureDates;
  }
  async getAvailableTimes(date: string): Promise<{ time: string; therapists: { id: string; name: string }[] }[]> {
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
      select: { startTime: true, endTime: true, therapist: { select: { id: true, name: true } } },
    });

    if (!allSchedules.length) {
      return [];
    }

    // 🔹 Criar um mapa de horários disponíveis
    const availableTimesMap = new Map<string, Set<{ id: string; name: string }>>();

    allSchedules.forEach(({ startTime, endTime, therapist }) => {
      let currentTime = parseInt(startTime.replace(':', ''), 10);
      const endTimeInt = parseInt(endTime.replace(':', ''), 10);

      while (currentTime < endTimeInt) {
        const formattedTime = `${String(Math.floor(currentTime / 100)).padStart(2, '0')}:00`;

        if (!availableTimesMap.has(formattedTime)) {
          availableTimesMap.set(formattedTime, new Set());
        }

        availableTimesMap.get(formattedTime)?.add({ id: therapist.id, name: therapist.name });

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
        therapistIds.forEach((therapistId) => therapists?.delete({ id: therapistId, name: '' }));
        if (therapists?.size === 0) {
          availableTimesMap.delete(startTime);
        }
      }
    });

    // 🔹 Retornar horários disponíveis com terapeutas
    return Array.from(availableTimesMap.entries()).map(([time, therapists]) => ({
      time,
      therapists: Array.from(therapists),
    }));
  }
  async findAll() {
    return this.prisma.appointment.findMany({
      include: { client: true, therapist: true },
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
}