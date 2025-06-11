import { ApiProperty } from '@nestjs/swagger';

export class ConsumptionDetailDto {
  @ApiProperty({ description: 'ID único do registro de consumo' })
  id: string;

  @ApiProperty({ description: 'ID do agendamento relacionado ao consumo' })
  appointmentId: string;

  @ApiProperty({ description: 'Data e hora em que a sessão foi consumida' })
  consumedAt: Date;

  @ApiProperty({ description: 'ID da filial onde a sessão foi consumida' })
  branchId: string;
}
