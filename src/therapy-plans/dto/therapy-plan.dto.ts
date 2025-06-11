import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Interface para simplificar a estrutura das filiais
export class BranchDto {
  @ApiProperty({ description: 'ID da filial' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Nome da filial' })
  @IsString()
  name: string;
}

// DTO para respostas da API de planos de terapia
export class TherapyPlanDto {
  @ApiProperty({ description: 'ID do plano' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Nome do plano' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição do plano', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Número total de sessões' })
  @IsNumber()
  @IsPositive()
  totalSessions: number;

  @ApiProperty({ description: 'Preço total do plano' })
  @IsNumber()
  @IsPositive()
  totalPrice: number;

  @ApiProperty({ description: 'Dias de validade do plano' })
  @IsNumber()
  @IsPositive()
  validityDays: number;

  @ApiProperty({ description: 'Status de ativação do plano' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação do plano' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização do plano' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Filiais associadas ao plano',
    type: [BranchDto],
  })
  branches: BranchDto[];

  @ApiProperty({
    description: 'Número de assinaturas deste plano',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  subscriptionCount?: number;
}
