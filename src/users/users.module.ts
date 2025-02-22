import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // 🔹 Importando PrismaModule corretamente
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // 🔹 Importante: exporta UsersService
})
export class UsersModule {}