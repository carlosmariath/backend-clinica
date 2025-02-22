import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsappService {
  private readonly whatsappApiUrl: string;
  private readonly token: string;
  private readonly phoneId: string;

  constructor(private httpService: HttpService, private configService: ConfigService) {
    this.whatsappApiUrl = 'https://graph.facebook.com/v18.0';
    this.token = this.configService.get<string>('META_WHATSAPP_TOKEN') || '';
    this.phoneId = this.configService.get<string>('META_WHATSAPP_PHONE_ID') || '';
  }

  async sendMessage(to: string, message: string) {
    const url = `${this.whatsappApiUrl}/${this.phoneId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { Authorization: `Bearer ${this.token}` },
        })
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mensagem pelo WhatsApp:', error.response?.data || error.message);
      throw error;
    }
  }
}