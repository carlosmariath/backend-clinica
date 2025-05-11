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
} from '@nestjs/common';
import { TherapyPlansService } from './therapy-plans.service';
import { CreateTherapyPlanDto } from './dto/create-plan.dto';
import { UpdateTherapyPlanDto } from './dto/update-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStatus } from '@prisma/client';

@ApiTags('Planos de Terapia')
@Controller('therapy-plans')
@UseGuards(JwtAuthGuard)
export class TherapyPlansController {
  constructor(private readonly therapyPlansService: TherapyPlansService) {}

  // GERENCIAMENTO DE PLANOS

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar um novo plano de terapia' })
  create(@Body() createTherapyPlanDto: CreateTherapyPlanDto) {
    return this.therapyPlansService.create(createTherapyPlanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os planos de terapia' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por filial' })
  findAll(@Query('branchId') branchId?: string) {
    return this.therapyPlansService.findAll(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um plano específico' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  findOne(@Param('id') id: string) {
    return this.therapyPlansService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar um plano' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  update(
    @Param('id') id: string,
    @Body() updateTherapyPlanDto: UpdateTherapyPlanDto,
  ) {
    return this.therapyPlansService.update(id, updateTherapyPlanDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover um plano' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  remove(@Param('id') id: string) {
    return this.therapyPlansService.remove(id);
  }

  // GERENCIAMENTO DE SUBSCRIÇÕES

  @Post('/subscriptions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOperation({ summary: 'Criar uma nova subscrição de plano' })
  createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.therapyPlansService.createSubscription(createSubscriptionDto);
  }

  @Get('/subscriptions')
  @ApiOperation({ summary: 'Listar todas as subscrições' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filtrar por cliente' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por filial' })
  findAllSubscriptions(
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.therapyPlansService.findAllSubscriptions(clientId, status, branchId);
  }

  @Get('/subscriptions/:id')
  @ApiOperation({ summary: 'Obter uma subscrição específica' })
  @ApiParam({ name: 'id', description: 'ID da subscrição' })
  findSubscription(@Param('id') id: string) {
    return this.therapyPlansService.findSubscription(id);
  }

  @Post('/subscriptions/accept/:token')
  @ApiOperation({ summary: 'Aceitar uma subscrição pelo token' })
  @ApiParam({ name: 'token', description: 'Token de aceitação' })
  acceptSubscription(@Param('token') token: string) {
    return this.therapyPlansService.acceptSubscription(token);
  }

  @Patch('/subscriptions/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOperation({ summary: 'Cancelar uma subscrição' })
  @ApiParam({ name: 'id', description: 'ID da subscrição' })
  cancelSubscription(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.therapyPlansService.cancelSubscription(id, reason);
  }

  @Post('/check-expired')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Verificar e atualizar subscrições expiradas' })
  checkExpired() {
    return this.therapyPlansService.checkExpiredSubscriptions();
  }
} 