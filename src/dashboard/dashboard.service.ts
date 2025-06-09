import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics() {
    const totalAppointments = await this.prisma.appointment.count();
    const confirmedSessions = await this.prisma.appointment.count({
      where: { status: 'CONFIRMED' },
    });
    const canceledSessions = await this.prisma.appointment.count({
      where: { status: 'CANCELED' },
    });

    return {
      totalAppointments,
      confirmedSessions,
      canceledSessions,
    };
  }

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalAppointmentsCurrentMonth,
      totalAppointmentsPreviousMonth,
      confirmedSessions,
      canceledSessions,
      pendingSessions,
      clientsCount,
      activeClientsData,
      newClients,
      therapistsCount,
      revenueCurrentMonth,
      revenuePreviousMonth,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      this.prisma.appointment.count({
        where: {
          date: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth,
          },
        },
      }),
      this.prisma.appointment.count({
        where: {
          status: 'CONFIRMED',
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      this.prisma.appointment.count({
        where: {
          status: 'CANCELED',
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      this.prisma.appointment.count({
        where: {
          status: 'PENDING',
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'CLIENT',
        },
      }),
      this.prisma.appointment.findMany({
        where: {
          date: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          clientId: true,
        },
        distinct: ['clientId'],
      }),
      this.prisma.user.count({
        where: {
          role: 'CLIENT',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      this.prisma.therapist.count(),
      this.prisma.financialTransaction.aggregate({
        where: {
          type: 'REVENUE',
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          type: 'REVENUE',
          date: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const activeClients = activeClientsData.length;
    const currentRevenue = revenueCurrentMonth._sum?.amount || 0;
    const previousRevenue = revenuePreviousMonth._sum?.amount || 0;

    const confirmationRate = totalAppointmentsCurrentMonth > 0
      ? (confirmedSessions / totalAppointmentsCurrentMonth) * 100
      : 0;

    const appointmentsTrend = totalAppointmentsPreviousMonth > 0
      ? ((totalAppointmentsCurrentMonth - totalAppointmentsPreviousMonth) / totalAppointmentsPreviousMonth) * 100
      : 0;

    const previousMonthClients = await this.prisma.user.count({
      where: {
        role: 'CLIENT',
        createdAt: {
          lte: endOfPreviousMonth,
        },
      },
    });

    const currentMonthClients = clientsCount;
    const clientsTrend = previousMonthClients > 0
      ? ((currentMonthClients - previousMonthClients) / previousMonthClients) * 100
      : 0;

    const revenueTrend = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    return {
      totalAppointments: totalAppointmentsCurrentMonth,
      confirmedSessions,
      canceledSessions,
      pendingSessions,
      clientsCount,
      activeClients,
      newClients,
      therapistsCount,
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        trend: revenueTrend,
      },
      confirmationRate: Math.round(confirmationRate * 100) / 100,
      appointmentsTrend: Math.round(appointmentsTrend * 100) / 100,
      clientsTrend: Math.round(clientsTrend * 100) / 100,
      revenueTrend: Math.round(revenueTrend * 100) / 100,
    };
  }

  async getUpcomingAppointments(limit: number = 5) {
    const now = new Date();
    
    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: now,
        },
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        therapist: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
      take: limit,
    });

    return appointments.map(appointment => ({
      id: appointment.id,
      clientId: appointment.clientId,
      clientName: appointment.client.name,
      therapistId: appointment.therapistId,
      therapistName: appointment.therapist.name,
      service: appointment.service?.name || 'Serviço não informado',
      date: appointment.date.toISOString().split('T')[0],
      time: appointment.startTime,
      status: appointment.status.toLowerCase(),
    }));
  }

  async getRevenueChart(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;
    let labels: string[] = [];
    let groupBy: string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }));
        }
        groupBy = 'day';
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), i, 1);
          labels.push(date.toLocaleDateString('pt-BR', { month: 'short' }));
        }
        groupBy = 'month';
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(now.getFullYear(), now.getMonth(), i);
          labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }));
        }
        groupBy = 'day';
        break;
    }

    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        type: 'REVENUE',
        date: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        amount: true,
        date: true,
      },
    });

    const data = new Array(labels.length).fill(0);
    
    transactions.forEach(transaction => {
      let index: number;
      
      if (period === 'week') {
        const daysDiff = Math.floor((transaction.date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        index = daysDiff;
      } else if (period === 'year') {
        index = transaction.date.getMonth();
      } else { // month
        index = transaction.date.getDate() - 1;
      }
      
      if (index >= 0 && index < data.length) {
        data[index] += Number(transaction.amount);
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Receita',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
        },
      ],
    };
  }

  async getAppointmentsByTherapist() {
    const appointmentCounts = await this.prisma.appointment.groupBy({
      by: ['therapistId'],
      _count: {
        id: true,
      },
    });

    const totalAppointments = appointmentCounts.reduce((sum, item) => sum + item._count.id, 0);

    const therapistIds = appointmentCounts.map(item => item.therapistId);
    const therapists = await this.prisma.therapist.findMany({
      where: {
        id: {
          in: therapistIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const result = appointmentCounts.map(item => {
      const therapist = therapists.find(t => t.id === item.therapistId);
      const count = item._count.id;
      const percentage = totalAppointments > 0 ? (count / totalAppointments) * 100 : 0;

      return {
        therapistId: item.therapistId,
        therapistName: therapist?.name || 'Terapeuta não encontrado',
        count,
        percentage: Math.round(percentage * 100) / 100,
      };
    });

    return result.sort((a, b) => b.count - a.count);
  }

  async getServiceDistribution() {
    const serviceCounts = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      _count: {
        id: true,
      },
    });

    const totalAppointments = serviceCounts.reduce((sum, item) => sum + item._count.id, 0);

    const serviceIds = serviceCounts.map(item => item.serviceId).filter(id => id !== null);
    const services = await this.prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const result = serviceCounts.map(item => {
      const service = services.find(s => s.id === item.serviceId);
      const count = item._count.id;
      const percentage = totalAppointments > 0 ? (count / totalAppointments) * 100 : 0;

      return {
        serviceId: item.serviceId || 'no-service',
        serviceName: service?.name || 'Serviço não informado',
        count,
        percentage: Math.round(percentage * 100) / 100,
      };
    });

    return result.sort((a, b) => b.count - a.count);
  }

  async getFullDashboard(upcomingLimit: number = 5, revenueChartPeriod: 'week' | 'month' | 'year' = 'month') {
    const [
      stats,
      upcomingAppointments,
      revenueChart,
      appointmentsByTherapist,
      serviceDistribution,
    ] = await Promise.all([
      this.getStats(),
      this.getUpcomingAppointments(upcomingLimit),
      this.getRevenueChart(revenueChartPeriod),
      this.getAppointmentsByTherapist(),
      this.getServiceDistribution(),
    ]);

    return {
      stats,
      upcomingAppointments,
      revenueChart,
      appointmentsByTherapist,
      serviceDistribution,
      lastUpdate: new Date().toISOString(),
    };
  }
}
