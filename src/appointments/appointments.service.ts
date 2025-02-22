import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

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
}