import { Controller, Post, Get, Body, Param, UseGuards, Req, Put, Delete, Patch } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentStatus } from '@prisma/client';

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

  @Get()
  async listAppointments() {
    return this.appointmentsService.findAll();
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
  async updateStatus(@Param('appointmentId') appointmentId: string, @Body() body: { status: AppointmentStatus }) {
    return this.appointmentsService.updateStatus(appointmentId, body.status);
  }
}
