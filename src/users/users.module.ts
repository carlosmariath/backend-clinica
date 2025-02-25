import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Module({
 imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET })],
  providers: [UsersService, JwtAuthGuard, RolesGuard],
  controllers: [UsersController],
  exports: [UsersService], // 🔹 Importante: exporta UsersService
})
export class UsersModule {}