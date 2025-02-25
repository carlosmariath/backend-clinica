import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics() {
    const totalAppointments = await this.prisma.appointment.count();
    const confirmedSessions = await this.prisma.appointment.count({
      where: { status: 'CONFIRMED' },
    });
    const canceledSessions = await this.prisma.appointment.count({
      where: { status: 'CANCELED' },
    });

    return {
      totalAppointments,
      confirmedSessions,
      canceledSessions,
    };
  }
}