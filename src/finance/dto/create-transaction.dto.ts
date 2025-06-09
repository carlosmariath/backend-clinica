import { IsString, IsNumber, IsUUID, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Definir explicitamente o enum
enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'Tipo da transação (REVENUE para receitas, EXPENSE para despesas)', enum: TransactionType, example: 'REVENUE' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Valor da transação em reais', example: 150.00 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Descrição detalhada da transação', example: 'Sessão de psicoterapia individual - Paciente João Silva' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Categoria legácia da transação (use financeCategoryId para nova estrutura)', example: 'CONSULTA' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Data e hora da transação', example: '2024-08-15T10:00:00Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'ID do cliente associado à transação (opcional)', example: '550e8400-e29b-41d4-a716-446655440000', required: false })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ description: 'ID da filial onde ocorreu a transação (opcional)', example: '550e8400-e29b-41d4-a716-446655440000', required: false })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ description: 'Referência a outro objeto do sistema (opcional)', example: '550e8400-e29b-41d4-a716-446655440000', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ description: 'Tipo da referência (appointment, subscription, etc.)', example: 'appointment', required: false })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiProperty({ description: 'ID do método de pagamento utilizado (opcional)', example: '550e8400-e29b-41d4-a716-446655440000', required: false })
  @IsUUID()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({ description: 'ID da categoria financeira (recomendado para nova estrutura)', example: '550e8400-e29b-41d4-a716-446655440000', required: false })
  @IsUUID()
  @IsOptional()
  financeCategoryId?: string;
} 