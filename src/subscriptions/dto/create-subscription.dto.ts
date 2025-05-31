import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'ID do cliente que será assinante do plano' })
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'ID do plano de terapia a ser assinado' })
  @IsNotEmpty()
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'ID da filial onde a assinatura foi criada (opcional)' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
} 