import { Branch, TherapyPlan as PrismaTherapyPlan } from '@prisma/client';

/**
 * Modelo otimizado para representar um plano de terapia com suas filiais
 */
export class TherapyPlan {
  id: string;
  name: string;
  description?: string;
  totalSessions: number;
  totalPrice: number;
  validityDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  branches: BranchSummary[];
  subscriptionCount?: number;

  /**
   * Converte um plano do Prisma para o modelo otimizado
   */
  static fromPrisma(
    plan: PrismaTherapyPlan & {
      branches?: Branch[];
      _count?: { subscriptions: number };
    },
  ): TherapyPlan {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description || undefined,
      totalSessions: plan.totalSessions,
      totalPrice: plan.totalPrice,
      validityDays: plan.validityDays,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      branches: plan.branches
        ? plan.branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
          }))
        : [],
      subscriptionCount: plan._count?.subscriptions,
    };
  }

  /**
   * Converte uma lista de planos do Prisma para o modelo otimizado
   */
  static fromPrismaList(
    plans: (PrismaTherapyPlan & {
      branches?: Branch[];
      _count?: { subscriptions: number };
    })[],
  ): TherapyPlan[] {
    return plans.map((plan) => TherapyPlan.fromPrisma(plan));
  }
}

/**
 * Versão simplificada de uma filial para listar nos planos
 */
export class BranchSummary {
  id: string;
  name: string;
}

/**
 * Plano com informações mínimas para listagens
 */
export class TherapyPlanSummary {
  id: string;
  name: string;
  totalSessions: number;
  totalPrice: number;
  isActive: boolean;
}
