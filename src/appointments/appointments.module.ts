import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { JwtModule } from '@nestjs/jwt';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
   imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET })],
    providers: [AppointmentsService, JwtAuthGuard, RolesGuard],
    controllers: [AppointmentsController],
    exports: [AppointmentsService],
})
export class AppointmentsModule {}

