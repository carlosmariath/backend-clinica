import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TherapistsService {
  constructor(private prisma: PrismaService) {}

  async createTherapist(name: string, email: string, phone: string, specialty: string) {
    return this.prisma.therapist.create({  // 🔹 Verifique se `therapist` está correto aqui
      data: { name, email, phone, specialty },
    });
  }

  async listTherapists() {
    return this.prisma.therapist.findMany({ include: { schedules: true } });
  }

  async defineAvailability(therapistId: string, schedule: { dayOfWeek: number; startTime: string; endTime: string }) {
    return this.prisma.schedule.create({
      data: { therapistId, ...schedule },
    });
  }

  async getAvailability(therapistId: string) {
    return this.prisma.schedule.findMany({ where: { therapistId } });
  }
  async findTherapistByName(name: string) {
    return this.prisma.therapist.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } },
    });
  }
}