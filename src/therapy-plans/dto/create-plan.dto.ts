import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTherapyPlanDto {
  @ApiProperty({ description: 'Nome do plano de terapia', example: 'Plano Premium' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição do plano', example: 'Plano completo com 12 sessões' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Número total de sessões do plano', example: 12 })
  @IsNumber()
  @Min(1)
  totalSessions: number;

  @ApiProperty({ description: 'Preço total do plano', example: 1200.00 })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiProperty({ description: 'Dias de validade do plano', example: 90 })
  @IsNumber()
  @Min(1)
  validityDays: number;

  @ApiProperty({ description: 'Se o plano está ativo para vendas', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'ID da filial associada (opcional)', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  branchId?: string;
} 