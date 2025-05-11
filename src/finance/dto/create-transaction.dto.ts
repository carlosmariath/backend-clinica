import { IsString, IsNumber, IsUUID, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Definir explicitamente o enum
enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'Tipo da transação (REVENUE ou EXPENSE)', enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Valor da transação', example: 100.00 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Descrição da transação', example: 'Pagamento de consulta' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Categoria da transação', example: 'CONSULTA' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Data da transação', example: '2023-08-15T10:00:00Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'ID do cliente relacionado (opcional)', example: 'uuid', required: false })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ description: 'ID da filial relacionada (opcional)', example: 'uuid', required: false })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ description: 'Referência a outro objeto (opcional)', example: 'uuid', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ description: 'Tipo de referência (opcional)', example: 'appointment', required: false })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiProperty({ description: 'ID do método de pagamento (opcional)', example: 'uuid', required: false })
  @IsUUID()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({ description: 'ID da categoria financeira (opcional)', example: 'uuid', required: false })
  @IsUUID()
  @IsOptional()
  financeCategoryId?: string;
} 