import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // Database
  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL') || '';
  }

  // JWT
  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || 'default-secret';
  }

  // Server
  get port(): number {
    return this.configService.get<number>('PORT') || 3000;
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') || 'development';
  }

  // WhatsApp
  get whatsappToken(): string {
    return this.configService.get<string>('META_WHATSAPP_TOKEN') || '';
  }

  get whatsappPhoneId(): string {
    return this.configService.get<string>('META_WHATSAPP_PHONE_ID') || '';
  }

  get whatsappVerifyToken(): string {
    return this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') || '';
  }

  // OpenAI
  get openaiApiKey(): string {
    return this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  // Context Prompt
  get contextPrompt(): string {
    return this.configService.get<string>('CONTEXT_PROMPT') || `
      Você é um assistente virtual para uma clínica de massagens e terapias. 
      Seu nome é ZenBot, e sua função é ajudar clientes a agendarem sessões.
    `;
  }

  // Pinecone
  get pineconeApiKey(): string {
    return this.configService.get<string>('PINECONE_API_KEY') || '';
  }

  get pineconeEnvironment(): string {
    return this.configService.get<string>('PINECONE_ENV') || 'us-east-1';
  }

  get pineconeIndex(): string {
    return this.configService.get<string>('PINECONE_INDEX') || 'clinica';
  }

  // CORS Origins
  get corsOrigins(): string[] {
    const origins = this.configService.get<string>('CORS_ORIGINS');
    if (origins) {
      return origins.split(',');
    }
    
    return this.nodeEnv === 'production' 
      ? ['https://painel-clinica.vercel.app'] 
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
  }

  // Validation method
  validateConfig(): void {
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET'
    ];

    const missingVars = requiredVars.filter(varName => {
      const value = this.configService.get<string>(varName);
      return !value || value.trim() === '';
    });

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ Environment variables validated successfully');
  }

  // Debug method to log configuration (without sensitive data)
  logConfiguration(): void {
    if (this.nodeEnv === 'development') {
      console.log('🔧 Configuration loaded:');
      console.log(`  - NODE_ENV: ${this.nodeEnv}`);
      console.log(`  - PORT: ${this.port}`);
      console.log(`  - DATABASE_URL: ${this.databaseUrl ? '✅ Set' : '❌ Missing'}`);
      console.log(`  - JWT_SECRET: ${this.jwtSecret ? '✅ Set' : '❌ Missing'}`);
      console.log(`  - WHATSAPP_TOKEN: ${this.whatsappToken ? '✅ Set' : '❌ Missing'}`);
      console.log(`  - OPENAI_API_KEY: ${this.openaiApiKey ? '✅ Set' : '❌ Missing'}`);
      console.log(`  - PINECONE_API_KEY: ${this.pineconeApiKey ? '✅ Set' : '❌ Missing'}`);
      console.log(`  - CORS_ORIGINS: ${this.corsOrigins.join(', ')}`);
    }
  }
}