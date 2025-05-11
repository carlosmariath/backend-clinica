import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Definir explicitamente o enum
enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export class CreateFinanceCategoryDto {
  @ApiProperty({ description: 'Nome da categoria', example: 'Consultas Médicas' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tipo da transação (REVENUE ou EXPENSE)', enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Descrição da categoria (opcional)', example: 'Valores recebidos por consultas', required: false })
  @IsString()
  @IsOptional()
  description?: string;
} 