import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TherapistsModule } from './therapists/therapists.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, TherapistsModule, AppointmentsModule, WhatsappModule, 
    ConfigModule.forRoot(), // 🔹 Garante que as variáveis de ambiente sejam carregadas
  ],
  
})
export class AppModule { }

