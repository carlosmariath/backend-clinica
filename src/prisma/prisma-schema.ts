/**
 * Este arquivo define interfaces personalizadas para os modelos do Prisma
 * que são usados no projeto.
 */

export interface TherapyPlan {
  id: string;
  name: string;
  description: string | null;
  totalSessions: number;
  totalPrice: number;
  validityDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  therapyPlanBranches?: TherapyPlanBranch[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TherapyPlanBranch {
  id: string;
  therapyPlanId: string;
  branchId: string;
  createdAt: Date;
  branch?: Branch;
  therapyPlan?: TherapyPlan;
}

export interface Subscription {
  id: string;
  planId: string;
  clientId: string;
  branchId: string | null;
  token: string;
  tokenExpiresAt: Date;
  acceptedAt: Date | null;
  validUntil: Date | null;
  status: string;
  sessionsLeft: number;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  plan?: TherapyPlan;
  client?: any; // Definição simplificada
} 