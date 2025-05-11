import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Service } from '@prisma/client';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Service[]> {
    return await this.prisma.service.findMany();
  }

  async findById(id: string): Promise<Service | null> {
    return await this.prisma.service.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    description?: string;
    price: number;
  }): Promise<Service> {
    return await this.prisma.service.create({ data });
  }
}
