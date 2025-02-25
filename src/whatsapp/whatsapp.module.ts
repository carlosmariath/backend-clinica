import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { AppointmentsModule } from 'src/appointments/appointments.module';
import { TherapistsModule } from 'src/therapists/therapists.module';
import { UsersModule } from 'src/users/users.module';
import { ChatModule } from 'src/chat/chat.module';
import { KnowledgeModule } from 'src/knowledge/knowledge.module';

@Module({
  imports: [HttpModule, ConfigModule, AppointmentsModule, TherapistsModule, UsersModule, ChatModule, KnowledgeModule],
  providers: [WhatsappService],
  controllers: [WhatsappController],
})
export class WhatsappModule {}