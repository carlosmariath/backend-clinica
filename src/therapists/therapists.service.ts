import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TherapistsService {
  constructor(private prisma: PrismaService) {}

  // Função utilitária para calcular o dia da semana corretamente no timezone de São Paulo
  private getDayOfWeekFromDateString(dateString: string): number {
    // Parse manual da data para evitar problemas de timezone
    const [year, month, day] = dateString.split('-').map(Number);

    // Criar data em UTC meia-noite
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Meio-dia UTC para evitar edge cases

    // Aplicar offset do timezone de São Paulo (-3 horas)
    const saoPauloOffset = -3 * 60; // -3 horas em minutos
    const saoPauloDate = new Date(date.getTime() + saoPauloOffset * 60 * 1000);

    // Retorna 0-6 (Domingo-Sábado) - formato padrão JavaScript
    return saoPauloDate.getUTCDay() + 1 == 8 ? 0 : saoPauloDate.getUTCDay() + 1;
  }

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
    schedule: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      id?: string;
    },
  ) {
    // 1. Verificar se o terapeuta está associado à filial
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

    // 2. Caso de edição (com ID fornecido)
    if (schedule.id) {
      const existingSchedule = await this.prisma.schedule.findUnique({
        where: { id: schedule.id },
      });

      // Verificar se o horário existe
      if (!existingSchedule) {
        throw new Error('Horário não encontrado');
      }

      // Verificar se o horário pertence ao terapeuta
      if (existingSchedule.therapistId !== therapistId) {
        throw new Error('Você não tem permissão para editar este horário');
      }

      // Verificar se há outro horário com as mesmas informações (exceto o atual)
      const duplicateCheck = await this.prisma.schedule.findFirst({
        where: {
          therapistId,
          branchId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          NOT: { id: schedule.id },
        },
      });

      if (duplicateCheck) {
        throw new Error('Já existe um horário idêntico cadastrado');
      }

      // Atualizar o horário
      return this.prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          // branchId permanece o mesmo, não permitimos alterar a filial na edição
        },
      });
    }

    // 3. Caso de criação (sem ID)
    // Verificar se já existe um horário idêntico
    const existingSchedule = await this.prisma.schedule.findFirst({
      where: {
        therapistId,
        branchId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      },
    });

    if (existingSchedule) {
      return existingSchedule; // Retorna o existente sem criar duplicata
    }

    // Criar novo horário
    return this.prisma.schedule.create({
      data: {
        therapistId,
        branchId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
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

  // Remover um horário específico
  async removeSchedule(scheduleId: string, therapistId: string) {
    // Verificar se o horário pertence ao terapeuta
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Horário não encontrado');
    }

    if (schedule.therapistId !== therapistId) {
      throw new Error('Você não tem permissão para remover este horário');
    }

    return this.prisma.schedule.delete({
      where: { id: scheduleId },
    });
  }

  // Verificar se há conflito entre horários em diferentes filiais
  async checkScheduleConflicts(
    therapistId: string,
    scheduleData: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      branchId: string;
      id?: string; // Opcional para permitir edição
    },
  ) {
    // Converter horários para minutos para facilitar a comparação
    const startMinutes = this.convertTimeToMinutes(scheduleData.startTime);
    const endMinutes = this.convertTimeToMinutes(scheduleData.endTime);

    // Buscar todos os horários deste terapeuta no mesmo dia da semana
    // IMPORTANTE: Excluímos o horário atual (caso seja edição) e também horários
    // da mesma filial, pois queremos apenas detectar conflitos entre filiais diferentes
    const existingSchedules = await this.prisma.schedule.findMany({
      where: {
        therapistId,
        dayOfWeek: scheduleData.dayOfWeek,
        // Excluir o próprio registro se for uma edição
        ...(scheduleData.id && { NOT: { id: scheduleData.id } }),
        // Importante: excluir horários da mesma filial, pois só queremos
        // verificar conflitos entre filiais diferentes
        NOT: { branchId: scheduleData.branchId },
      },
    });

    // Verificar sobreposição
    const conflict = existingSchedules.find((schedule) => {
      const scheduleStart = this.convertTimeToMinutes(schedule.startTime);
      const scheduleEnd = this.convertTimeToMinutes(schedule.endTime);

      return (
        (startMinutes >= scheduleStart && startMinutes < scheduleEnd) || // Início dentro do existente
        (endMinutes > scheduleStart && endMinutes <= scheduleEnd) || // Fim dentro do existente
        (startMinutes <= scheduleStart && endMinutes >= scheduleEnd) // Engloba o existente
      );
    });

    if (conflict) {
      // Se encontrou conflito, buscar a filial para mensagem detalhada
      const branch = await this.prisma.branch.findUnique({
        where: { id: conflict.branchId },
        select: { name: true },
      });

      return {
        hasConflict: true,
        conflictInfo: {
          branchName: branch?.name || 'Filial desconhecida',
          branchId: conflict.branchId,
          day: conflict.dayOfWeek,
          time: `${conflict.startTime} - ${conflict.endTime}`,
        },
      };
    }

    return { hasConflict: false };
  }

  // Método auxiliar para converter horário (HH:MM) para minutos desde 00:00
  private convertTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Buscar horários disponíveis para agendar com um terapeuta em uma filial específica
  async getAvailableTimeSlots(
    therapistId: string,
    date: string,
    branchId?: string,
  ) {
    // 1. Buscar a configuração de horários do terapeuta para o dia da semana
    // Usando Luxon para garantir o fuso horário de São Paulo
    const dayOfWeek = this.getDayOfWeekFromDateString(date);

    const scheduleQuery = {
      where: {
        therapistId,
        dayOfWeek,
        ...(branchId && { branchId }),
      },
    };

    const schedules = await this.prisma.schedule.findMany(scheduleQuery);

    if (schedules.length === 0) {
      return {
        available: false,
        reason:
          'O terapeuta não tem horário configurado para este dia nesta filial',
        slots: [],
      };
    }

    // 2. Buscar agendamentos existentes para este dia
    // Parse manual da data para evitar problemas de timezone
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setHours(0, 0, 0, 0); // Normaliza para início do dia

    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        therapistId,
        date: {
          gte: dateObj,
          lt: nextDay,
        },
        ...(branchId && { branchId }),
        NOT: {
          status: 'CANCELED',
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // 3. Gerar todos os slots disponíveis baseados na configuração
    const availableSlots: string[] = [];
    const busySlots = appointments.map((app) => `${app.startTime}`);

    // Para cada configuração de horário deste dia
    for (const schedule of schedules) {
      const { startTime, endTime } = schedule;

      // Converter para minutos para cálculos
      const startMinutes = this.convertTimeToMinutes(startTime);
      const endMinutes = this.convertTimeToMinutes(endTime);

      // Gerar slots de 30 minutos
      const slotDuration = 30; // minutos

      for (let time = startMinutes; time < endMinutes; time += slotDuration) {
        const hour = Math.floor(time / 60);
        const minute = time % 60;

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Verificar se este horário já está ocupado
        if (!busySlots.includes(timeString)) {
          availableSlots.push(timeString);
        }
      }
    }

    return {
      available: availableSlots.length > 0,
      slots: availableSlots,
      workHours: schedules.map((s) => ({ start: s.startTime, end: s.endTime })),
    };
  }

  // Buscar disponibilidade de um terapeuta em todas as filiais para uma data
  async getTherapistAvailabilityAcrossBranches(
    therapistId: string,
    date: string,
  ) {
    // 1. Buscar todas as filiais onde o terapeuta atende
    const therapistBranches = await this.prisma.therapistBranch.findMany({
      where: {
        therapistId,
        isActive: true,
      },
      include: { branch: true },
    });

    if (therapistBranches.length === 0) {
      return {
        message: 'Terapeuta não está associado a nenhuma filial',
        branches: [],
      };
    }

    // 2. Para cada filial, buscar a disponibilidade
    const branchAvailability = await Promise.all(
      therapistBranches.map(async (tb) => {
        const availability = await this.getAvailableTimeSlots(
          therapistId,
          date,
          tb.branchId,
        );

        return {
          branchId: tb.branchId,
          branchName: tb.branch.name,
          available: availability.available,
          slots: availability.slots,
          workHours: availability.workHours,
        };
      }),
    );

    return {
      therapistId,
      date,
      branches: branchAvailability,
    };
  }

  // Remover todos os horários de um terapeuta em uma filial específica
  async removeAllSchedulesFromBranch(therapistId: string, branchId: string) {
    // Verificar se o terapeuta está associado à filial
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

    // Buscar todos os horários do terapeuta nesta filial
    const schedules = await this.prisma.schedule.findMany({
      where: {
        therapistId,
        branchId,
      },
      select: { id: true },
    });

    if (schedules.length === 0) {
      return {
        deleted: 0,
        message: 'Não foram encontrados horários para excluir',
      };
    }

    // Excluir todos os horários de uma vez
    const result = await this.prisma.schedule.deleteMany({
      where: {
        therapistId,
        branchId,
      },
    });

    return {
      deleted: result.count,
      message: `${result.count} horários excluídos com sucesso`,
    };
  }
}
