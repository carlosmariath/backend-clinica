import { Module } from '@nestjs/common';
import { TherapyPlansService } from './therapy-plans.service';
import { TherapyPlansController } from './therapy-plans.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { SessionConsumptionService } from './session-consumption.service';

@Module({
  imports: [AuthModule],
  controllers: [TherapyPlansController],
  providers: [TherapyPlansService, PrismaService, SessionConsumptionService],
  exports: [TherapyPlansService, SessionConsumptionService],
})
export class TherapyPlansModule {}