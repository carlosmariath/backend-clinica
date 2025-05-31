import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  Min, 
  IsUUID, 
  IsArray, 
  ArrayMinSize,
  MaxLength,
  IsNotEmpty
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateTherapyPlanDto {
  @ApiProperty({ 
    description: 'Nome do plano de terapia', 
    example: 'Plano Premium',
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome do plano é obrigatório' })
  @MaxLength(100, { message: 'O nome do plano deve ter no máximo 100 caracteres' })
  name: string;

  @ApiProperty({ 
    description: 'Descrição do plano', 
    example: 'Plano completo com 12 sessões',
    required: false,
    maxLength: 500
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  description?: string;

  @ApiProperty({ 
    description: 'Número total de sessões do plano', 
    example: 12,
    minimum: 1
  })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'O número de sessões deve ser um número válido' })
  @Min(1, { message: 'O plano deve ter pelo menos 1 sessão' })
  @Type(() => Number)
  totalSessions: number;

  @ApiProperty({ 
    description: 'Preço total do plano', 
    example: 1200.00,
    minimum: 0
  })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }, { message: 'O preço deve ser um número válido com no máximo 2 casas decimais' })
  @Min(0, { message: 'O preço não pode ser negativo' })
  @Type(() => Number)
  totalPrice: number;

  @ApiProperty({ 
    description: 'Dias de validade do plano', 
    example: 90,
    minimum: 1
  })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Os dias de validade devem ser um número válido' })
  @Min(1, { message: 'A validade deve ser de pelo menos 1 dia' })
  @Type(() => Number)
  validityDays: number;

  @ApiProperty({ 
    description: 'Se o plano está ativo para vendas', 
    example: true,
    default: true,
    required: false
  })
  @IsBoolean({ message: 'O status ativo deve ser true ou false' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiProperty({ 
    description: 'IDs das filiais associadas ao plano', 
    type: [String], 
    example: ['uuid1', 'uuid2'],
    minItems: 1
  })
  @IsArray({ message: 'A lista de filiais deve ser um array' })
  @ArrayMinSize(1, { message: 'O plano deve estar associado a pelo menos uma filial' })
  @IsUUID("4", { each: true, message: 'Todos os IDs de filiais devem ser UUIDs válidos' })
  branchIds: string[];
} 