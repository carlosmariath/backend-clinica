import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cria uma nova filial
   */
  async create(data: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  }) {
    return this.prisma.branch.create({
      data,
    });
  }

  /**
   * Lista todas as filiais
   */
  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.branch.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obtém uma filial específica pelo ID
   */
  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            therapistBranches: true,
            appointments: true,
            users: true,
            services: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Filial com ID ${id} não encontrada`);
    }

    return branch;
  }

  /**
   * Atualiza uma filial existente
   */
  async update(
    id: string,
    data: {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      isActive?: boolean;
    },
  ) {
    await this.findOne(id); // Verifica se a filial existe

    return this.prisma.branch.update({
      where: { id },
      data,
    });
  }

  /**
   * Remove uma filial (soft delete alterando isActive para false)
   */
  async deactivate(id: string) {
    await this.findOne(id); // Verifica se a filial existe

    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Obter resumo de dados da filial (contagem de entidades relacionadas)
   */
  async getBranchSummary(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            therapistBranches: true,
            appointments: true,
            users: true,
            services: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Filial com ID ${id} não encontrada`);
    }

    // Contagem de agendamentos ativos
    const activeAppointments = await this.prisma.appointment.count({
      where: {
        branchId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      stats: {
        therapists: branch._count.therapistBranches,
        totalAppointments: branch._count.appointments,
        activeAppointments,
        users: branch._count.users,
        services: branch._count.services,
      },
    };
  }
}
