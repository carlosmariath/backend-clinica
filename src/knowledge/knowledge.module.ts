import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { KnowledgeService } from "./knowledge.service";
import { KnowledgeController } from "./knowledge.controller";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET })], // 🔹 Importando Prisma para acessar o banco de dados
  providers: [KnowledgeService],
  controllers: [KnowledgeController],
  exports: [KnowledgeService], // 🔹 Exportamos para ser usado no WhatsAppService
})
export class KnowledgeModule {}