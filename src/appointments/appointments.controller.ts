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
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentStatus } from '@prisma/client';
import { Request } from 'express';

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
      startTime: string;
      endTime: string;
      branchId?: string;
    },
  ) {
    const branchId = body.branchId || req.user.branchId;

    return this.appointmentsService.createAppointment(
      body.clientId,
      body.therapistId,
      body.date,
      body.startTime,
      body.endTime,
      branchId,
    );
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

  @Post(':appointmentId/cancel')
  async cancelAppointment(
    @Req() req: RequestWithUser,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.appointmentsService.cancelAppointment(
      appointmentId,
      req.user.sub,
    );
  }

  @Get()
  async listAppointments(
    @Req() req: RequestWithUser,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId = branchId || req.user.branchId;

    return this.appointmentsService.findAll(effectiveBranchId);
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
}
