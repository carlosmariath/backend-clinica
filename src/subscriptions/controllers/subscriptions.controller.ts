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
  HttpCode,
  NotFoundException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SubscriptionsService } from '../services/subscriptions.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { SubscriptionDto } from '../dto/subscription.dto';
import { ConsumptionDetailDto } from '../dto/consumption-detail.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as assinaturas com filtros opcionais' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filtrar por cliente' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por uma filial específica' })
  @ApiQuery({ name: 'branchIds', required: false, description: 'Filtrar por múltiplas filiais', isArray: true })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 20)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de assinaturas', type: [SubscriptionDto] })
  async findAll(
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('branchIds') branchIds?: string[],
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<{ data: SubscriptionDto[]; total: number; page: number; limit: number }> {
    // Unificar os parâmetros de filial para compatibilidade
    const branches = branchIds?.length ? branchIds : (branchId ? [branchId] : undefined);
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    
    return this.subscriptionsService.findAll(clientId, status, branches, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma assinatura pelo ID' })
  @ApiParam({ name: 'id', description: 'ID da assinatura' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assinatura encontrada', type: SubscriptionDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assinatura não encontrada' })
  async findOne(@Param('id') id: string): Promise<SubscriptionDto> {
    const subscription = await this.subscriptionsService.findOne(id);
    
    if (!subscription) {
      throw new NotFoundException(`Assinatura com ID ${id} não encontrada`);
    }
    
    return subscription;
  }

  @Post()
  @ApiOperation({ summary: 'Criar uma nova assinatura' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Assinatura criada com sucesso', type: SubscriptionDto })
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto): Promise<SubscriptionDto> {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar uma assinatura' })
  @ApiParam({ name: 'id', description: 'ID da assinatura a ser cancelada' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assinatura cancelada com sucesso', type: SubscriptionDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assinatura não encontrada' })
  async cancel(@Param('id') id: string): Promise<SubscriptionDto> {
    return this.subscriptionsService.cancel(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover uma assinatura' })
  @ApiParam({ name: 'id', description: 'ID da assinatura a ser removida' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Assinatura removida com sucesso' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assinatura não encontrada' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.subscriptionsService.remove(id);
  }

  @Get(':id/consumption')
  @ApiOperation({ summary: 'Obter o histórico de consumo de uma assinatura' })
  @ApiParam({ name: 'id', description: 'ID da assinatura' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Histórico de consumo', type: [ConsumptionDetailDto] })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assinatura não encontrada' })
  async getConsumptionHistory(@Param('id') id: string): Promise<ConsumptionDetailDto[]> {
    return this.subscriptionsService.getConsumptionHistory(id);
  }
} 