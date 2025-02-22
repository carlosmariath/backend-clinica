import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [WhatsappService],
  controllers: [WhatsappController],
})
export class WhatsappModule {}