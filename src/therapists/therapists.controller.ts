import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  Delete,
  Query,
  Patch,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TherapistsService } from './therapists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('therapists')
export class TherapistsController {
  constructor(private therapistsService: TherapistsService) {}

  // 🔹 Apenas ADMIN pode cadastrar terapeutas
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createTherapist(
    @Body()
    body: {
      name: string;
      email: string;
      phone: string;
      specialty: string;
      branchIds?: string[]; // Nova lista de IDs de filiais
    },
  ) {
    return this.therapistsService.createTherapist(
      body.name,
      body.email,
      body.phone,
      body.specialty,
      body.branchIds,
    );
  }

  // 🔹 Apenas usuários autenticados podem listar terapeutas
  @UseGuards(JwtAuthGuard)
  @Get()
  async listTherapists(
    @Query('serviceId') serviceId?: string,
    @Query('branchId') branchId?: string, // Novo parâmetro branchId
  ) {
    if (serviceId && branchId) {
      return this.therapistsService.listTherapistsByService(
        serviceId,
        branchId,
      );
    } else if (serviceId) {
      return this.therapistsService.listTherapistsByService(serviceId);
    } else if (branchId) {
      return this.therapistsService.listTherapists(branchId);
    }
    return this.therapistsService.listTherapists();
  }

  // 🔹 Associar serviço a terapeuta (ADMIN ou o próprio terapeuta)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':therapistId/services/:serviceId')
  async addServiceToTherapist(
    @Req() req,
    @Param('therapistId') therapistId: string,
    @Param('serviceId') serviceId: string,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException(
        'Você só pode associar serviços ao seu próprio perfil.',
      );
    }
    return this.therapistsService.addServiceToTherapist(therapistId, serviceId);
  }

  // 🔹 Desassociar serviço de terapeuta (ADMIN ou o próprio terapeuta)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':therapistId/services/:serviceId')
  async removeServiceFromTherapist(
    @Req() req,
    @Param('therapistId') therapistId: string,
    @Param('serviceId') serviceId: string,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException(
        'Você só pode desassociar serviços do seu próprio perfil.',
      );
    }
    return this.therapistsService.removeServiceFromTherapist(
      therapistId,
      serviceId,
    );
  }

  // 🔹 Apenas terapeutas podem definir sua própria disponibilidade
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':therapistId/schedule')
  async defineAvailability(
    @Req() req,
    @Param('therapistId') therapistId: string,
    @Body()
    body: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      branchId: string; // Parâmetro branchId obrigatório
      id?: string;      // ID opcional para edição
    },
  ) {
    try {
      // Verificação de permissão
      if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
        throw new ForbiddenException(
          'Você só pode definir sua própria disponibilidade.',
        );
      }

      // Validação básica dos dados
      if (body.dayOfWeek < 0 || body.dayOfWeek > 6) {
        throw new BadRequestException('Dia da semana inválido (0-6)');
      }

      if (!body.startTime || !body.endTime) {
        throw new BadRequestException('Horários de início e fim são obrigatórios');
      }

      if (!body.branchId) {
        throw new BadRequestException('ID da filial é obrigatório');
      }

      // Chamar o serviço
      const result = await this.therapistsService.defineAvailability(
        therapistId,
        body.branchId,
        {
          dayOfWeek: body.dayOfWeek,
          startTime: body.startTime,
          endTime: body.endTime,
          id: body.id,
        },
      );

      return result;
    } catch (error) {
      // Tratar erros específicos do serviço
      if (error.message === 'O terapeuta não pertence a esta filial') {
        throw new BadRequestException(error.message);
      }
      if (error.message === 'Horário não encontrado') {
        throw new BadRequestException(error.message);
      }
      if (error.message === 'Você não tem permissão para editar este horário') {
        throw new ForbiddenException(error.message);
      }
      if (error.message === 'Já existe um horário idêntico cadastrado') {
        throw new BadRequestException(error.message);
      }

      // Para outros erros não mapeados
      throw new HttpException(
        error.message || 'Erro ao definir disponibilidade',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 🔹 Apenas usuários autenticados podem ver a disponibilidade dos terapeutas
  @UseGuards(JwtAuthGuard)
  @Get(':therapistId/schedule')
  async getAvailability(
    @Param('therapistId') therapistId: string,
    @Query('branchId') branchId?: string, // Novo parâmetro branchId opcional
  ) {
    return this.therapistsService.getAvailability(therapistId, branchId);
  }

  // 🔹 Endpoints para gerenciar filiais do terapeuta

  // Listar filiais do terapeuta
  @UseGuards(JwtAuthGuard)
  @Get(':therapistId/branches')
  async getTherapistBranches(@Param('therapistId') therapistId: string) {
    return this.therapistsService.getTherapistBranches(therapistId);
  }

  // Adicionar terapeuta a uma filial (apenas ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':therapistId/branches/:branchId')
  async addBranchToTherapist(
    @Param('therapistId') therapistId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.therapistsService.addBranchToTherapist(therapistId, branchId);
  }

  // Remover terapeuta de uma filial (apenas ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':therapistId/branches/:branchId')
  async removeBranchFromTherapist(
    @Param('therapistId') therapistId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.therapistsService.removeBranchFromTherapist(
      therapistId,
      branchId,
    );
  }

  // 🔹 Buscar todos os horários do terapeuta em todas as filiais (para o próprio terapeuta)
  @UseGuards(JwtAuthGuard)
  @Get('me/schedules/all')
  async getMyAllSchedules(@Req() req) {
    return this.therapistsService.getAllSchedules(req.user.sub);
  }

  // 🔹 Buscar todos os horários de um terapeuta específico em todas as filiais (para admins ou o próprio terapeuta)
  @UseGuards(JwtAuthGuard)
  @Get(':therapistId/schedules/all')
  async getAllTherapistSchedules(
    @Req() req,
    @Param('therapistId') therapistId: string,
  ) {
    // Verificar se é admin ou o próprio terapeuta
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException(
        'Você só pode visualizar seus próprios horários.',
      );
    }
    return this.therapistsService.getAllSchedules(therapistId);
  }

  // 🔹 Verificar conflitos de agenda em outras filiais
  @UseGuards(JwtAuthGuard)
  @Post(':therapistId/schedule/check-conflicts')
  async checkScheduleConflicts(
    @Req() req,
    @Param('therapistId') therapistId: string,
    @Body() scheduleData: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      branchId: string;
      id?: string;
    },
  ) {
    // Verificar se é admin ou o próprio terapeuta
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException(
        'Você só pode verificar seus próprios horários.',
      );
    }
    return this.therapistsService.checkScheduleConflicts(therapistId, scheduleData);
  }

  // 🔹 Buscar disponibilidade de um terapeuta para uma data específica em uma filial
  @UseGuards(JwtAuthGuard)
  @Get(':therapistId/availability')
  async getTherapistAvailability(
    @Param('therapistId') therapistId: string,
    @Query('date') date: string,
    @Query('branchId') branchId?: string,
  ) {
    if (!date) {
      throw new BadRequestException('Data é obrigatória');
    }
    return this.therapistsService.getAvailableTimeSlots(therapistId, date, branchId);
  }

  // 🔹 Buscar disponibilidade de um terapeuta em todas as filiais para uma data
  @UseGuards(JwtAuthGuard)
  @Get(':therapistId/availability/all-branches')
  async getTherapistAvailabilityAcrossBranches(
    @Param('therapistId') therapistId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('Data é obrigatória');
    }
    return this.therapistsService.getTherapistAvailabilityAcrossBranches(therapistId, date);
  }

  // 🔹 Remover um horário de terapeuta (ADMIN ou o próprio terapeuta)
  @UseGuards(JwtAuthGuard)
  @Delete(':therapistId/schedule/:scheduleId')
  async removeSchedule(
    @Req() req,
    @Param('therapistId') therapistId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException(
        'Você só pode remover seus próprios horários.',
      );
    }
    return this.therapistsService.removeSchedule(scheduleId, therapistId);
  }

  // 🔹 Atualizar dados do terapeuta (ADMIN ou o próprio terapeuta)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':therapistId')
  async updateTherapist(
    @Req() req,
    @Param('therapistId') therapistId: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      specialty?: string;
    },
  ) {
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException(
        'Você só pode atualizar seu próprio perfil.',
      );
    }
    return this.therapistsService.updateTherapist(therapistId, body);
  }

  // 🔹 Remover todos os horários de um terapeuta em uma filial específica
  @UseGuards(JwtAuthGuard)
  @Delete(':therapistId/schedule/branch/:branchId')
  async removeAllSchedulesFromBranch(
    @Req() req,
    @Param('therapistId') therapistId: string,
    @Param('branchId') branchId: string,
  ) {
    // Verificar se é admin ou o próprio terapeuta
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException(
        'Você só pode remover seus próprios horários.',
      );
    }
    
    try {
      return this.therapistsService.removeAllSchedulesFromBranch(therapistId, branchId);
    } catch (error) {
      if (error.message === 'O terapeuta não pertence a esta filial') {
        throw new BadRequestException(error.message);
      }
      throw new HttpException(
        error.message || 'Erro ao excluir horários',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
