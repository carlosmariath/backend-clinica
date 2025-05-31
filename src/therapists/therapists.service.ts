import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TherapistsService {
  constructor(private prisma: PrismaService) {}

  async createTherapist(
    name: string,
    email: string,
    phone: string,
    specialty: string,
    branchIds?: string[],
  ) {
    const therapist = await this.prisma.therapist.create({
      data: { name, email, phone, specialty },
    });

    if (branchIds && branchIds.length > 0) {
      await this.prisma.therapistBranch.createMany({
        data: branchIds.map((branchId) => ({
          therapistId: therapist.id,
          branchId,
        })),
      });
    } else {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { isActive: true },
      });

      if (defaultBranch) {
        await this.prisma.therapistBranch.create({
          data: {
            therapistId: therapist.id,
            branchId: defaultBranch.id,
          },
        });
      }
    }

    return this.prisma.therapist.findUnique({
      where: { id: therapist.id },
      include: {
        therapistBranches: { include: { branch: true } },
        therapistServices: { include: { service: true } },
      },
    });
  }

  async listTherapists(branchId?: string) {
    if (branchId) {
      return this.prisma.therapist.findMany({
        where: {
          therapistBranches: {
            some: {
              branchId,
              isActive: true,
            },
          },
        },
        include: {
          schedules: true,
          therapistBranches: { include: { branch: true } },
          therapistServices: { include: { service: true } },
        },
      });
    }

    return this.prisma.therapist.findMany({
      include: {
        schedules: true,
        therapistBranches: { include: { branch: true } },
        therapistServices: { include: { service: true } },
      },
    });
  }

  async defineAvailability(
    therapistId: string,
    branchId: string,
    schedule: { dayOfWeek: number; startTime: string; endTime: string },
  ) {
    const therapistBranch = await this.prisma.therapistBranch.findUnique({
      where: {
        therapistId_branchId: {
          therapistId,
          branchId,
        },
      },
    });

    if (!therapistBranch) {
      throw new Error('O terapeuta não pertence a esta filial');
    }

    return this.prisma.schedule.create({
      data: {
        therapistId,
        branchId,
        ...schedule,
      },
    });
  }

  async getAvailability(therapistId: string, branchId?: string) {
    if (branchId) {
      return this.prisma.schedule.findMany({
        where: {
          therapistId,
          branchId,
        },
      });
    }

    return this.prisma.schedule.findMany({
      where: { therapistId },
      include: { branch: true },
    });
  }

  async findTherapistByName(name: string) {
    return this.prisma.therapist.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } },
      include: {
        therapistBranches: { include: { branch: true } },
      },
    });
  }

  async addServiceToTherapist(therapistId: string, serviceId: string) {
    return this.prisma.therapistService.create({
      data: { therapistId, serviceId },
    });
  }

  async removeServiceFromTherapist(therapistId: string, serviceId: string) {
    return this.prisma.therapistService.deleteMany({
      where: { therapistId, serviceId },
    });
  }

  async listTherapistsByService(serviceId: string, branchId?: string) {
    const where: any = {
      therapistServices: {
        some: { serviceId },
      },
    };

    if (branchId) {
      where.therapistBranches = {
        some: {
          branchId,
          isActive: true,
        },
      };
    }

    return this.prisma.therapist.findMany({
      where,
      include: {
        schedules: branchId ? { where: { branchId } } : true,
        therapistBranches: { include: { branch: true } },
        therapistServices: { include: { service: true } },
      },
    });
  }

  async addBranchToTherapist(therapistId: string, branchId: string) {
    return this.prisma.therapistBranch.upsert({
      where: {
        therapistId_branchId: {
          therapistId,
          branchId,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        therapistId,
        branchId,
        isActive: true,
      },
    });
  }

  async removeBranchFromTherapist(therapistId: string, branchId: string) {
    return this.prisma.therapistBranch.update({
      where: {
        therapistId_branchId: {
          therapistId,
          branchId,
        },
      },
      data: {
        isActive: false,
      },
    });
  }

  async getTherapistBranches(therapistId: string) {
    return this.prisma.therapistBranch.findMany({
      where: {
        therapistId,
        isActive: true,
      },
      include: {
        branch: true,
      },
    });
  }

  async updateTherapist(
    therapistId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      specialty?: string;
    },
  ) {
    return this.prisma.therapist.update({
      where: { id: therapistId },
      data,
      include: {
        therapistBranches: { include: { branch: true } },
        therapistServices: { include: { service: true } },
      },
    });
  }

  // Buscar todos os horários de um terapeuta em todas as filiais
  async getAllSchedules(therapistId: string) {
    return this.prisma.schedule.findMany({
      where: { therapistId },
      include: { branch: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }
}
