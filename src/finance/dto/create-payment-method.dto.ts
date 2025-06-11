import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Nome do método de pagamento', example: 'PIX' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Descrição detalhada do método (opcional)',
    example: 'Pagamentos instantâneos via PIX',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Indica se o método está disponível para uso',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
