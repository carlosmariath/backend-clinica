import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateSession(userId: string, phoneNumber: string) {
    // 🔹 Verifica se já existe uma sessão ativa nos últimos 30 minutos
    const session = await this.prisma.chatSession.findFirst({
      where: {
        phoneNumber,
        updatedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Últimos 30 min
      },
    });

    if (session) return session;

    // 🔹 Se não existir, cria uma nova sessão
    await this.prisma.chatSession.deleteMany({
      where: { phoneNumber },
    });
    
    return this.prisma.chatSession.create({
      data: {
        userId,
        phoneNumber,
        history: [],
      },
    });
  }

  async updateSession(phoneNumber: string, history: any) {
    return this.prisma.chatSession.update({
      where: { phoneNumber },
      data: { history },
    });
  }
}