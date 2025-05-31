import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TherapyPlanService } from '../services/therapy-plan.service';
import { TherapyPlansService } from '../services/therapy-plans.service';
import { CreateTherapyPlanDto } from '../dto/create-plan.dto';
import { UpdateTherapyPlanDto } from '../dto/update-plan.dto';
import { TherapyPlanDto } from '../dto/therapy-plan.dto';

@ApiTags('therapy-plans')
@Controller('therapy-plans')
export class TherapyPlansController {
  constructor(
    private readonly planService: TherapyPlanService,
    private readonly plansService: TherapyPlansService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo plano de terapia' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Plano criado com sucesso', type: TherapyPlanDto })
  async create(@Body() createPlanDto: CreateTherapyPlanDto): Promise<TherapyPlanDto> {
    return this.planService.create(createPlanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os planos de terapia' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por filial' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de planos', type: [TherapyPlanDto] })
  async findAll(@Query('branchId') branchId?: string): Promise<TherapyPlanDto[]> {
    return this.planService.findAll(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um plano pelo ID' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Plano encontrado', type: TherapyPlanDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Plano não encontrado' })
  async findOne(@Param('id') id: string): Promise<TherapyPlanDto> {
    return this.planService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um plano pelo ID' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Plano atualizado', type: TherapyPlanDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Plano não encontrado' })
  async update(
    @Param('id') id: string, 
    @Body() updatePlanDto: UpdateTherapyPlanDto
  ): Promise<TherapyPlanDto> {
    return this.planService.update(id, updatePlanDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um plano pelo ID' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Plano removido com sucesso' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Plano não encontrado' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Plano não pode ser removido' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.planService.remove(id);
  }

  // Endpoints para gerenciar a relação com filiais
  @Post(':id/branches')
  @ApiOperation({ summary: 'Adicionar uma filial a um plano' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Filial adicionada ao plano', type: TherapyPlanDto })
  async addBranch(
    @Param('id') planId: string,
    @Body('branchId') branchId: string
  ): Promise<TherapyPlanDto> {
    return this.plansService.addBranchToPlan(planId, branchId);
  }

  @Delete(':id/branches/:branchId')
  @ApiOperation({ summary: 'Remover uma filial de um plano' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiParam({ name: 'branchId', description: 'ID da filial' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Filial removida do plano', type: TherapyPlanDto })
  async removeBranch(
    @Param('id') planId: string,
    @Param('branchId') branchId: string
  ): Promise<TherapyPlanDto> {
    return this.plansService.removeBranchFromPlan(planId, branchId);
  }
} 