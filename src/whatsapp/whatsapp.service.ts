import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { OpenAI } from 'openai';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { TherapistsService } from '../therapists/therapists.service';
import { UsersService } from '../users/users.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class WhatsappService {
  private readonly whatsappApiUrl: string;
  private readonly token: string;
  private readonly phoneId: string;
  private readonly contextPrompt: string;
  private openai: OpenAI;
  pendingTherapistSelections: any;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private usersService: UsersService,
    private appointmentsService: AppointmentsService,
    private therapistsService: TherapistsService,
    private chatService: ChatService,
    private knowledgeService: KnowledgeService, // 🔹 Injetando o serviço de conhecimento
  ) {
    this.whatsappApiUrl = 'https://graph.facebook.com/v18.0';
    this.token = this.configService.get<string>('META_WHATSAPP_TOKEN') || '';
    this.phoneId =
      this.configService.get<string>('META_WHATSAPP_PHONE_ID') || '';
    this.contextPrompt = this.configService.get<string>('CONTEXT_PROMPT') || '';
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.pendingTherapistSelections = {};
  }

  async processMessage(phoneNumber: string, userMessage: string) {
    const client = await this.usersService.findByPhone(phoneNumber);
    const session = client
      ? await this.chatService.getOrCreateSession(client.id, phoneNumber)
      : null;
    const history: any[] = session
      ? Array.isArray(session.history)
        ? session.history
        : []
      : [];

    // 🔹 Buscar na base de conhecimento com contexto
    const knowledgeAnswer =
      await this.knowledgeService.searchKnowledge(userMessage);

    if (knowledgeAnswer) {
      // 🔹 Passar a resposta pelo GPT para reformulação e personalização
      const gptResponse = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente de uma clínica de terapia.
            
            ${client ? `O cliente se chama ${client.name}.` : 'Não sabemos o nome do cliente ainda.'}
            
            Reformule a resposta da base de conhecimento de forma amigável, personalizada e profissional.
            Se o nome do cliente for conhecido, use-o na sua resposta para torná-la mais pessoal.
            Mantenha o tom acolhedor e empático, apropriado para uma clínica de terapia.`,
          },
          {
            role: 'user',
            content: `Pergunta: ${userMessage}\nResposta da base de conhecimento: ${knowledgeAnswer}`,
          },
        ],
      });

      const reformulatedResponse = gptResponse.choices[0].message.content;

      // Salvando a interação no histórico
      history.push({ role: 'user', content: userMessage });
      history.push({ role: 'assistant', content: reformulatedResponse });

      if (session) {
        await this.chatService.updateSession(phoneNumber, history);
      }

      return this.sendMessage(
        phoneNumber,
        reformulatedResponse || knowledgeAnswer,
      );
    }

    // 🔹 Criar contexto para o GPT caso a base de conhecimento não tenha resposta
    const userContext = client
      ? `O usuário se chama ${client.name} e já é cadastrado. Telefone: ${phoneNumber}.`
      : `O usuário ainda não é cadastrado. Número: ${phoneNumber}.`;

    const messages = [
      { role: 'system', content: `${this.contextPrompt}\n${userContext}` },
      ...history,
      { role: 'user', content: userMessage },
    ];

    // 🔹 Salvar a resposta no histórico da sessão
    history.push({ role: 'user', content: userMessage });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'register_client',
            description: 'Registra um novo cliente para agendamento.',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nome do cliente.' },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'E-mail do cliente.',
                },
              },
              required: ['name', 'email'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'list_available_dates',
            description: 'Lista os dias disponíveis para agendamento.',
          },
        },
        {
          type: 'function',
          function: {
            name: 'list_available_times',
            description: 'Lista horários disponíveis para um determinado dia.',
            parameters: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  format: 'date',
                  description: 'Data do agendamento (YYYY-MM-DD).',
                },
              },
              required: ['date'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'schedule_appointment',
            description: 'Agenda uma sessão de terapia.',
            parameters: {
              type: 'object',
              properties: {
                therapistName: {
                  type: 'string',
                  description: 'Nome do terapeuta que irá atender.',
                },
                date: {
                  type: 'string',
                  format: 'date',
                  description: 'Data do agendamento (YYYY-MM-DD).',
                },
                time: {
                  type: 'string',
                  format: 'HH:mm',
                  description: 'Hora do agendamento.',
                },
              },
              required: ['therapistName', 'date', 'time'],
            },
          },
        },
      ],
      tool_choice: 'auto',
      temperature: 0.1,
      top_p: 0.5,
    });
    if (response.choices[0].message.tool_calls) {
      for (const toolCall of response.choices[0].message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        let result: string[] = [];
        if (toolCall.function.name === 'register_client') {
          result = await this.registerClient(
            phoneNumber,
            args.name,
            args.email,
          );
        }

        if (toolCall.function.name === 'list_available_dates') {
          result = await this.listAvailableDates(phoneNumber);
        }

        if (toolCall.function.name === 'list_available_times') {
          result = await this.listAvailableTimes(phoneNumber, args.date);
        }

        if (toolCall.function.name === 'schedule_appointment') {
          result = await this.scheduleAppointment(
            phoneNumber,
            args.date,
            args.time,
          );
        }
        history.push({
          role: 'assistant',
          content: null,
          function_call: toolCall.function,
          result,
        });
        history.push({
          role: 'assistant',
          content: `Resultado da função ${toolCall.function.name}: ${result}`,
        });

        await this.chatService.updateSession(phoneNumber, history);
        return;
      }
    }
    history.push({
      role: 'assistant',
      content: response.choices[0].message.content,
    });
    if (session) {
      await this.chatService.updateSession(phoneNumber, history);
    }

    return this.sendMessage(
      phoneNumber,
      response.choices[0].message.content || 'Não entendi sua solicitação.',
    );
  }
  registerClient(phoneNumber: string, name: any, email: any): any {
    throw new Error('Method not implemented.');
  }

  async listAvailableDates(phoneNumber: string) {
    // Exemplo fixo: buscar para o primeiro terapeuta e serviço do sistema, mês atual
    const therapist = await this.therapistsService.listTherapists();
    const services = await this.therapistsService.listTherapists();
    // Aqui você pode customizar para buscar o terapeuta/serviço correto do contexto do usuário
    const therapistId = therapist[0]?.id;
    const serviceId = therapist[0]?.therapistServices?.[0]?.service?.id;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const availableDatesObj = await this.appointmentsService.getAvailableDates({
      services: serviceId,
      therapistId,
      month,
    });
    
    // Corrigir acesso ao objeto retornado, que tem uma propriedade 'dates'
    const availableDates = availableDatesObj.dates
      .filter((d) => d.available)
      .map((d) => d.date);
      
    const message =
      'Aqui estão as datas disponíveis para agendamento:\n' +
      availableDates.map((date) => `📅 ${date}`).join('\n');
    await this.sendMessage(phoneNumber, message);
    return availableDates;
  }

  async listAvailableTimes(phoneNumber: string, date: string) {
    // Exemplo fixo: buscar para o primeiro terapeuta e serviço do sistema
    const therapist = await this.therapistsService.listTherapists();
    const therapistId = therapist[0]?.id;
    const serviceId = therapist[0]?.therapistServices?.[0]?.service?.id;
    const availableTimesObj = await this.appointmentsService.getAvailableSlots({
      services: serviceId,
      therapistId,
      date,
    });
    
    // Corrigir acesso ao objeto retornado, que tem uma propriedade 'slots'
    const availableTimes = availableTimesObj.slots
      .filter(slot => slot.available)
      .map(slot => slot.time);
      
    const message =
      'Aqui estão os horários disponíveis para a data selecionada:\n' +
      availableTimes.map((time) => `🕒 ${time}`).join('\n');
    await this.sendMessage(phoneNumber, message);
    return availableTimes;
  }

  async scheduleAppointment(phoneNumber: string, date: string, time: string) {
    const client = await this.usersService.findByPhone(phoneNumber);
    if (!client) {
      return this.sendMessage(
        phoneNumber,
        'Desculpe, não encontramos seu cadastro.',
      );
    }

    // 🔹 Buscar terapeutas disponíveis para o horário escolhido
    const availableTimes =
      await this.appointmentsService.getAvailableTimes(date);
    const selectedTime = availableTimes.find((t) => t.time === time);

    if (!selectedTime || selectedTime.therapists.length === 0) {
      return this.sendMessage(
        phoneNumber,
        `Infelizmente, não há terapeutas disponíveis para o horário ${time} no dia ${date}.`,
      );
    }

    if (selectedTime.therapists.length === 1) {
      // 🔹 Apenas um terapeuta disponível, seguir com o agendamento
      return this.confirmAppointment(
        phoneNumber,
        client.id,
        selectedTime.therapists[0].id,
        date,
        time,
      );
    }

    // 🔹 Mais de um terapeuta disponível, perguntar ao usuário qual ele prefere
    this.pendingTherapistSelections[phoneNumber] = {
      clientId: client.id,
      date,
      time,
      therapists: selectedTime.therapists,
    };

    const therapistOptions = selectedTime.therapists
      .map((t, index) => `${index + 1}. ${t.name}`)
      .join('\n');
    return this.sendMessage(
      phoneNumber,
      `Temos mais de um terapeuta disponível para o horário ${time} no dia ${date}.\n\nEscolha um terapeuta respondendo com o número correspondente:\n${therapistOptions}`,
    );
  }
  async handleTherapistSelection(phoneNumber: string, userMessage: string) {
    const selection = this.pendingTherapistSelections[phoneNumber];

    if (!selection) {
      return this.sendMessage(
        phoneNumber,
        'Não há nenhuma seleção de terapeuta pendente. Por favor, inicie o agendamento novamente.',
      );
    }

    const therapistIndex = parseInt(userMessage, 10) - 1;
    if (
      isNaN(therapistIndex) ||
      therapistIndex < 0 ||
      therapistIndex >= selection.therapists.length
    ) {
      return this.sendMessage(
        phoneNumber,
        'Por favor, escolha um número válido da lista de terapeutas.',
      );
    }

    const selectedTherapist = selection.therapists[therapistIndex];
    delete this.pendingTherapistSelections[phoneNumber];

    return this.confirmAppointment(
      phoneNumber,
      selection.clientId,
      selectedTherapist.id,
      selection.date,
      selection.time,
    );
  }
  async confirmAppointment(
    phoneNumber: string,
    clientId: string,
    therapistId: string,
    date: string,
    time: string,
  ) {
    // Calcular o horário de término (adicionando 60 minutos ao horário de início)
    const [hours, minutes] = time.split(':').map(Number);
    const endHours = hours + 1; // Adiciona 1 hora
    const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    await this.appointmentsService.createAppointment(
      clientId,
      therapistId,
      date,
      time,
      endTime,
    );

    return this.sendMessage(
      phoneNumber,
      `✅ Seu agendamento com o terapeuta foi confirmado para *${date}* às *${time}*.`,
    );
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
        }),
      );
      return response.data;
    } catch (error) {
      console.error(
        'Erro ao enviar mensagem:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
