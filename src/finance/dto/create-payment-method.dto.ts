import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Nome do método de pagamento', example: 'Cartão de Crédito' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição do método (opcional)', example: 'Pagamentos via cartão de crédito', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Se o método está ativo', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 