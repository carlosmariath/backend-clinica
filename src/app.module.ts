import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TherapistsModule } from './therapists/therapists.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { ServiceModule } from './service/service.module';
import { BranchModule } from './branch/branch.module';
import { TherapyPlansModule } from './therapy-plans/therapy-plans.module';
import { FinanceModule } from './finance/finance.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TherapistsModule,
    AppointmentsModule,
    WhatsappModule,
    ChatModule,
    DashboardModule,
    KnowledgeModule,
    ServiceModule,
    BranchModule,
    TherapyPlansModule,
    FinanceModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
