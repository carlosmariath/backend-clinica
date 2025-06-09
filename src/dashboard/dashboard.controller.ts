import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard) // 🔹 Protege com autenticação JWT
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboardStats() {
    return this.dashboardService.getStatistics();
  }

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('upcoming-appointments')
  async getUpcomingAppointments(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.dashboardService.getUpcomingAppointments(parsedLimit);
  }

  @Get('revenue-chart')
  async getRevenueChart(@Query('period') period?: 'week' | 'month' | 'year') {
    return this.dashboardService.getRevenueChart(period || 'month');
  }

  @Get('appointments-by-therapist')
  async getAppointmentsByTherapist() {
    return this.dashboardService.getAppointmentsByTherapist();
  }

  @Get('service-distribution')
  async getServiceDistribution() {
    return this.dashboardService.getServiceDistribution();
  }

  @Get('full')
  async getFullDashboard(
    @Query('upcomingLimit') upcomingLimit?: string,
    @Query('period') period?: 'week' | 'month' | 'year'
  ) {
    const parsedLimit = upcomingLimit ? parseInt(upcomingLimit, 10) : 5;
    return this.dashboardService.getFullDashboard(parsedLimit, period || 'month');
  }
}
