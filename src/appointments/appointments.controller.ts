import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard) // Protegendo todas as rotas
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  async createAppointment(@Req() req, @Body() body: { therapistId: string; date: string; startTime: string; endTime: string }) {
    return this.appointmentsService.createAppointment(req.user.sub, body.therapistId, body.date, body.startTime, body.endTime);
  }

  @Get('client')
  async listAppointmentsByClient(@Req() req) {
    return this.appointmentsService.listAppointmentsByClient(req.user.sub);
  }

  @Get('therapist')
  async listAppointmentsByTherapist(@Req() req) {
    return this.appointmentsService.listAppointmentsByTherapist(req.user.sub);
  }

  @Post(':appointmentId/cancel')
  async cancelAppointment(@Req() req, @Param('appointmentId') appointmentId: string) {
    return this.appointmentsService.cancelAppointment(appointmentId, req.user.sub);
  }
}