import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Put,
  Delete,
  Patch,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentStatus } from '@prisma/client';
import { Request } from 'express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

// Interface para o payload do JWT
interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
    branchId?: string;
  };
}

@Controller('appointments')
@UseGuards(JwtAuthGuard) // Protegendo todas as rotas
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  async createAppointment(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      clientId: string;
      therapistId: string;
      date: string;
      startTime?: string;
      endTime?: string;
      branchId?: string;
      serviceId?: string;
      autoSchedule?: boolean;
      subscriptionId?: string;
      couponCode?: string;
      notes?: string;
    },
  ) {
    const branchId = body.branchId || req.user.branchId;

    // Se autoSchedule for true, o serviço deve encontrar o próximo horário disponível
    if (body.autoSchedule) {
      // TODO: Implementar lógica de auto-agendamento
      throw new BadRequestException('Auto-agendamento ainda não implementado');
    }

    // Validar que startTime e endTime estão presentes quando não é auto-agendamento
    if (!body.startTime || !body.endTime) {
      throw new BadRequestException(
        'startTime e endTime são obrigatórios quando autoSchedule não está ativo',
      );
    }

    return this.appointmentsService.createAppointment({
      clientId: body.clientId,
      therapistId: body.therapistId,
      serviceId: body.serviceId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      branchId,
      subscriptionId: body.subscriptionId,
      notes: body.notes,
    });
  }

  @Get('client')
  async listAppointmentsByClient(
    @Req() req: RequestWithUser,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId = branchId || req.user.branchId;

    return this.appointmentsService.listAppointmentsByClient(
      req.user.sub,
      effectiveBranchId,
    );
  }

  @Get('therapist')
  async listAppointmentsByTherapist(
    @Req() req: RequestWithUser,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId = branchId || req.user.branchId;

    return this.appointmentsService.listAppointmentsByTherapist(
      req.user.sub,
      effectiveBranchId,
    );
  }

  @Get()
  async listAppointments(
    @Req() req: RequestWithUser,
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const effectiveBranchId = branchId || req.user.branchId;
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    return this.appointmentsService.findAll(effectiveBranchId, pageNum, limitNum);
  }

  @Put(':id')
  async updateAppointment(@Param('id') id: string, @Body() data: any) {
    return this.appointmentsService.update(id, data);
  }

  @Delete(':id')
  async deleteAppointment(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }

  @Patch(':appointmentId/status')
  async updateStatus(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { status: AppointmentStatus },
  ) {
    return this.appointmentsService.updateStatus(appointmentId, body.status);
  }

  @Get('/availability')
  async getAvailability(
    @Query('services') services: string,
    @Query('therapistId') therapistId: string,
    @Query('month') month: string,
    @Query('branchId') branchId?: string,
    @Req() req?: RequestWithUser,
  ) {
    const effectiveBranchId = branchId || req?.user?.branchId;

    return this.appointmentsService.getAvailableDates({
      services,
      therapistId,
      month,
      branchId: effectiveBranchId,
    });
  }

  @Get('/availability/slots')
  async getAvailableSlots(
    @Query('services') services: string,
    @Query('therapistId') therapistId: string,
    @Query('date') date: string,
    @Query('branchId') branchId?: string,
    @Req() req?: RequestWithUser,
  ) {
    const effectiveBranchId = branchId || req?.user?.branchId;

    return this.appointmentsService.getAvailableSlots({
      services,
      therapistId,
      date,
      branchId: effectiveBranchId,
    });
  }

  @Get('/calendar')
  async listAppointmentsInRange(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('therapistId') therapistId?: string,
    @Query('clientId') clientId?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: RequestWithUser,
  ) {
    const effectiveBranchId = branchId || req?.user?.branchId;

    return this.appointmentsService.listAppointmentsInRange({
      start,
      end,
      therapistId,
      clientId,
      branchId: effectiveBranchId,
    });
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOperation({ summary: 'Confirmar um agendamento' })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  confirmAppointment(@Param('id') id: string) {
    return this.appointmentsService.confirmAppointment(id);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOperation({ summary: 'Cancelar um agendamento' })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiQuery({ name: 'applyNoShowFee', required: false, description: 'Aplicar taxa de no-show', type: 'boolean' })
  cancelAppointment(
    @Param('id') id: string,
    @Query('applyNoShowFee') applyNoShowFee?: string,
  ) {
    return this.appointmentsService.cancelAppointment(id, applyNoShowFee === 'true');
  }

  @Patch(':id/reschedule')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOperation({ summary: 'Reagendar um agendamento' })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  rescheduleAppointment(
    @Param('id') id: string,
    @Body('date') date: string,
    @Body('startTime') startTime: string,
    @Body('endTime') endTime: string,
  ) {
    return this.appointmentsService.rescheduleAppointment(id, date, startTime, endTime);
  }
}
