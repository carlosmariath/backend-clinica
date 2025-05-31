import { Injectable } from '@nestjs/common';
import { TherapyPlanService } from './therapy-plan.service';
import { TherapyPlanDto } from '../dto/therapy-plan.dto';

@Injectable()
export class TherapyPlansService {
  constructor(private readonly therapyPlanService: TherapyPlanService) {}

  /**
   * Adiciona uma filial a um plano de terapia
   */
  async addBranchToPlan(planId: string, branchId: string): Promise<TherapyPlanDto> {
    return this.therapyPlanService.addBranchToPlan(planId, branchId);
  }

  /**
   * Remove uma filial de um plano de terapia
   */
  async removeBranchFromPlan(planId: string, branchId: string): Promise<TherapyPlanDto> {
    return this.therapyPlanService.removeBranchFromPlan(planId, branchId);
  }
} 