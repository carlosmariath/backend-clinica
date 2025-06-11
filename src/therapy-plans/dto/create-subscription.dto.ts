import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'ID do plano de terapia', example: 'uuid' })
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'ID do cliente', example: 'uuid' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'ID da filial (opcional)', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  branchId?: string;
}
