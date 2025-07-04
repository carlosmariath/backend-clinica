import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TherapistsModule } from './therapists/therapists.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
    AppConfigModule,
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
