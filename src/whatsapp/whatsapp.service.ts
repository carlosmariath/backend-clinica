import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { OpenAI } from 'openai';
import { AppointmentsService } from '../appointments/appointments.service';
import { TherapistsService } from '../therapists/therapists.service';

@Injectable()
export class WhatsappService {
  private readonly whatsappApiUrl: string;
  private readonly token: string;
  private readonly phoneId: string;
  private openai: OpenAI;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private appointmentsService: AppointmentsService,
    private therapistsService: TherapistsService
  ) {
    this.whatsappApiUrl = 'https://graph.facebook.com/v18.0';
    this.token = this.configService.get<string>('META_WHATSAPP_TOKEN') || '';
    this.phoneId = this.configService.get<string>('META_WHATSAPP_PHONE_ID') || '';

    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not defined');
    }
    this.openai = new OpenAI({ apiKey: openaiApiKey });
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
      console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
      throw error;
    }
  }

  async processMessage(phoneNumber: string, userMessage: string) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: userMessage }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'schedule_appointment',
            description: 'Agendar uma sessão de massagem',
            parameters: {
              type: 'object',
              properties: {
                therapistName: { type: 'string', description: 'Nome do terapeuta' },
                date: { type: 'string', format: 'date', description: 'Data da sessão (YYYY-MM-DD)' },
                time: { type: 'string', format: 'HH:mm', description: 'Hora da sessão' },
              },
              required: ['therapistName', 'date', 'time'],
            },
          },
        },
      ],
      tool_choice: 'auto',
    });

    if (response.choices[0].message.tool_calls) {
      const toolCall = response.choices[0].message.tool_calls[0];
      if (toolCall.function.name === 'schedule_appointment') {
        const args = JSON.parse(toolCall.function.arguments);
        return this.scheduleAppointment(phoneNumber, args.therapistName, args.date, args.time);
      }
    }

    return this.sendMessage(phoneNumber, response.choices[0].message.content || 'Não entendi sua solicitação.');
  }

  async scheduleAppointment(phoneNumber: string, therapistName: string, date: string, time: string) {
    const therapist = await this.therapistsService.findTherapistByName(therapistName);
    if (!therapist) {
      return this.sendMessage(phoneNumber, `Desculpe, não encontrei um terapeuta chamado ${therapistName}.`);
    }

    const appointment = await this.appointmentsService.createAppointment(phoneNumber, therapist.id, date, time, time);
    
    return this.sendMessage(phoneNumber, `Seu agendamento com ${therapist.name} foi confirmado para ${date} às ${time}.`);
  }
}