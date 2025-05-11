import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule], // Importando AuthModule que já exporta JwtModule
  providers: [KnowledgeService],
  controllers: [KnowledgeController],
  exports: [KnowledgeService], // 🔹 Exportamos para ser usado no WhatsAppService
})
export class KnowledgeModule {}
