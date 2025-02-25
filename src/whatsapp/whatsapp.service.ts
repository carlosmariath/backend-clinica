import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { OpenAI } from "openai";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { AppointmentsService } from "../appointments/appointments.service";
import { TherapistsService } from "../therapists/therapists.service";
import { UsersService } from "../users/users.service";
import { ChatService } from "../chat/chat.service";

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
    this.whatsappApiUrl = "https://graph.facebook.com/v18.0";
    this.token = this.configService.get<string>("META_WHATSAPP_TOKEN") || "";
    this.phoneId = this.configService.get<string>("META_WHATSAPP_PHONE_ID") || "";
    this.contextPrompt = this.configService.get<string>("CONTEXT_PROMPT") || "";
    this.openai = new OpenAI({ apiKey: this.configService.get<string>("OPENAI_API_KEY") });
    this.pendingTherapistSelections = {};
  }

  async processMessage(phoneNumber: string, userMessage: string) {
    let client = await this.usersService.findByPhone(phoneNumber);
    const session = client ? await this.chatService.getOrCreateSession(client.id, phoneNumber) : null;
    const history: any[] = session ? (Array.isArray(session.history) ? session.history : []) : [];

    // 🔹 Primeiro, verificar se a base de conhecimento tem uma resposta relevante
    const knowledgeAnswer = await this.knowledgeService.searchKnowledge(userMessage);
    
    if (knowledgeAnswer) {
      // 🔹 Passar a resposta pelo GPT para reformulação
      const gptResponse = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "Reformule essa resposta de forma amigável e profissional:" },
          { role: "user", content: `Pergunta: ${userMessage}\nResposta da base de conhecimento: ${knowledgeAnswer}` },
        ],
      });

      const reformulatedResponse = gptResponse.choices[0].message.content;
      if (reformulatedResponse) {
        return this.sendMessage(phoneNumber, reformulatedResponse);
      } else {
        throw new Error("Reformulated response is null");
      }
    }

    // 🔹 Criar contexto para o GPT caso a base de conhecimento não tenha resposta
    const userContext = client
      ? `O usuário se chama ${client.name} e já é cadastrado. Telefone: ${phoneNumber}.`
      : `O usuário ainda não é cadastrado. Número: ${phoneNumber}.`;

    const messages = [
      { role: "system", content: `${this.contextPrompt}\n${userContext}` },
      ...history,
      { role: "user", content: userMessage },
    ];

    // 🔹 Salvar a resposta no histórico da sessão
    history.push({ role: "user", content: userMessage });

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo",
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
                email: { type: 'string', format: 'email', description: 'E-mail do cliente.' },
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
                date: { type: 'string', format: 'date', description: 'Data do agendamento (YYYY-MM-DD).' },
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
                therapistName: { type: 'string', description: 'Nome do terapeuta que irá atender.' },
                date: { type: 'string', format: 'date', description: 'Data do agendamento (YYYY-MM-DD).' },
                time: { type: 'string', format: 'HH:mm', description: 'Hora do agendamento.' },
              },
              required: ['therapistName', 'date', 'time'],
            },
          },
        }
      ],
      tool_choice: "auto",
      temperature: 0.1,
      top_p: 0.5,
    });

    history.push({ role: "assistant", content: response.choices[0].message.content });

    if (session) {
      await this.chatService.updateSession(phoneNumber, history);
    }

    const assistantMessage = response.choices[0].message.content;
    if (assistantMessage) {
      return this.sendMessage(phoneNumber, assistantMessage);
    } else {
      throw new Error("Assistant response is null");
    }
  }

  async sendMessage(to: string, message: string) {
    const url = `${this.whatsappApiUrl}/${this.phoneId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
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
      console.error("Erro ao enviar mensagem:", error.response?.data || error.message);
      throw error;
    }
  }
}