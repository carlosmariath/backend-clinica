import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Definir explicitamente o enum
enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export class CreateFinanceCategoryDto {
  @ApiProperty({ description: 'Nome da categoria financeira', example: 'Consultas e Sessões' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tipo da categoria (REVENUE para receitas, EXPENSE para despesas)', enum: TransactionType, example: 'REVENUE' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Descrição detalhada da categoria (opcional)', example: 'Receitas provenientes de consultas e sessões de terapia', required: false })
  @IsString()
  @IsOptional()
  description?: string;
} 