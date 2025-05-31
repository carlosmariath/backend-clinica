import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionDto {
  @ApiProperty({ description: 'ID único da assinatura' })
  id: string;

  @ApiProperty({ description: 'ID do cliente associado à assinatura' })
  clientId: string;

  @ApiProperty({ description: 'ID do plano de terapia associado à assinatura' })
  therapyPlanId: string;

  @ApiProperty({ description: 'ID da filial onde a assinatura foi criada', required: false })
  branchId?: string;

  @ApiProperty({ description: 'Data de início da assinatura' })
  startDate: Date;

  @ApiProperty({ description: 'Data de término da assinatura' })
  endDate: Date;

  @ApiProperty({ description: 'Status da assinatura', enum: ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELED'] })
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELED';

  @ApiProperty({ description: 'Número total de sessões do plano' })
  totalSessions: number;

  @ApiProperty({ description: 'Número de sessões restantes' })
  remainingSessions: number;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização do registro' })
  updatedAt: Date;
} 