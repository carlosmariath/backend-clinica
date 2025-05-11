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
      branchId: string; // Novo parâmetro branchId obrigatório
    },
  ) {
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException(
        'Você só pode definir sua própria disponibilidade.',
      );
    }
    return this.therapistsService.defineAvailability(
      therapistId,
      body.branchId,
      body,
    );
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
}
