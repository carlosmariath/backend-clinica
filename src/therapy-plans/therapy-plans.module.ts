import { Module } from '@nestjs/common';
import { TherapyPlanService } from './services/therapy-plan.service';
import { TherapyPlansService } from './services/therapy-plans.service';
import { TherapyPlansController } from './controllers/therapy-plans.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionConsumptionService } from './session-consumption.service';

@Module({
  imports: [PrismaModule],
  controllers: [TherapyPlansController],
  providers: [TherapyPlanService, TherapyPlansService, SessionConsumptionService],
  exports: [TherapyPlanService, TherapyPlansService, SessionConsumptionService]
})
export class TherapyPlansModule {}