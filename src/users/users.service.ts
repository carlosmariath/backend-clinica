import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(
    name: string,
    email: string,
    password: string,
    role: Role,
    phone: string,
    branchId?: string,
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        branchId: true,
        createdAt: true,
      },
    });
  }

  // Criar um novo cliente (usuário com role CLIENT)
  async createClient(name: string, email: string, phone?: string) {
    // Gerar uma senha aleatória temporária que o cliente pode alterar depois
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    return this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'CLIENT',
        phone: phone || '', // Garantir que phone seja sempre string
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async findAllClients(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'CLIENT' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subscriptions: {
            include: {
              therapyPlan: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  totalSessions: true,
                  totalPrice: true,
                  validityDays: true,
                },
              },
            },
            where: {
              status: {
                in: ['ACTIVE', 'PENDING', 'EXPIRED'],
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: { role: 'CLIENT' },
      }),
    ]);

    return {
      data: clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Buscar todos os usuários administrativos (ADMIN e RECEPTIONIST)
  async findAdminUsers() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'RECEPTIONIST'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        branchId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Buscar um único usuário por ID
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        branchId: true,
      },
    });
  }

  // Atualizar usuário
  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: Role;
      phone?: string;
      branchId?: string;
    },
  ) {
    // Se uma senha foi fornecida, precisamos hashear antes de salvar
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        branchId: true,
      },
    });
  }

  // Excluir usuário
  async deleteUser(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
