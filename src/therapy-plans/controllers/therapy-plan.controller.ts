import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { TherapyPlanService } from '../services/therapy-plan.service';
import { CreateTherapyPlanDto } from '../dto/create-plan.dto';
import { UpdateTherapyPlanDto } from '../dto/update-plan.dto';
import { TherapyPlanDto } from '../dto/therapy-plan.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@ApiTags('Planos de Terapia')
@Controller('therapy-plans')
@UseGuards(JwtAuthGuard)
export class TherapyPlanController {
  constructor(private readonly therapyPlanService: TherapyPlanService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um novo plano de terapia' })
  @ApiCreatedResponse({
    description: 'Plano criado com sucesso',
    type: TherapyPlanDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou plano com mesmo nome já existe',
  })
  create(
    @Body() createTherapyPlanDto: CreateTherapyPlanDto,
  ): Promise<TherapyPlanDto> {
    return this.therapyPlanService.create(createTherapyPlanDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos os planos de terapia' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'Filtrar por filial',
  })
  @ApiOkResponse({
    description: 'Lista de planos retornada com sucesso',
    type: [TherapyPlanDto],
  })
  findAll(@Query('branchId') branchId?: string): Promise<TherapyPlanDto[]> {
    return this.therapyPlanService.findAll(branchId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter um plano específico' })
  @ApiParam({
    name: 'id',
    description: 'ID do plano',
  })
  @ApiOkResponse({
    description: 'Plano encontrado com sucesso',
    type: TherapyPlanDto,
  })
  @ApiNotFoundResponse({
    description: 'Plano não encontrado',
  })
  findOne(@Param('id') id: string): Promise<TherapyPlanDto> {
    return this.therapyPlanService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar um plano' })
  @ApiParam({
    name: 'id',
    description: 'ID do plano',
  })
  @ApiOkResponse({
    description: 'Plano atualizado com sucesso',
    type: TherapyPlanDto,
  })
  @ApiNotFoundResponse({
    description: 'Plano não encontrado',
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos para atualização',
  })
  update(
    @Param('id') id: string,
    @Body() updateTherapyPlanDto: UpdateTherapyPlanDto,
  ): Promise<TherapyPlanDto> {
    return this.therapyPlanService.update(id, updateTherapyPlanDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover um plano' })
  @ApiParam({
    name: 'id',
    description: 'ID do plano',
  })
  @ApiOkResponse({
    description: 'Plano removido com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Plano removido com sucesso' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Plano não encontrado',
  })
  @ApiBadRequestResponse({
    description:
      'Não é possível excluir o plano pois existem assinaturas ativas',
  })
  remove(@Param('id') id: string) {
    return this.therapyPlanService.remove(id);
  }
}
