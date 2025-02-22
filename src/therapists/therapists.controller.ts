import { Controller, Post, Get, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
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
  async createTherapist(@Body() body: { name: string; email: string; phone: string; specialty: string }) {
    return this.therapistsService.createTherapist(body.name, body.email, body.phone, body.specialty);
  }

  // 🔹 Apenas usuários autenticados podem listar terapeutas
  @UseGuards(JwtAuthGuard)
  @Get()
  async listTherapists() {
    return this.therapistsService.listTherapists();
  }

  // 🔹 Apenas terapeutas podem definir sua própria disponibilidade
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':therapistId/schedule')
  async defineAvailability(
    @Req() req,
    @Param('therapistId') therapistId: string,
    @Body() body: { dayOfWeek: number; startTime: string; endTime: string }
  ) {
    if (req.user.role !== 'ADMIN' && req.user.sub !== therapistId) {
      throw new ForbiddenException('Você só pode definir sua própria disponibilidade.');
    }
    return this.therapistsService.defineAvailability(therapistId, body);
  }

  // 🔹 Apenas usuários autenticados podem ver a disponibilidade dos terapeutas
  @UseGuards(JwtAuthGuard)
  @Get(':therapistId/schedule')
  async getAvailability(@Param('therapistId') therapistId: string) {
    return this.therapistsService.getAvailability(therapistId);
  }
}