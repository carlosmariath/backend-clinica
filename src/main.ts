import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS para produção
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://painel-clinica.vercel.app', 'https://your-frontend-domain.com'] 
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configurar validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Configurar Swagger apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API Clínica de Terapias')
      .setDescription('API para gestão de clínica de massagens e terapias')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.setGlobalPrefix('api');
  
  // Railway usa a variável PORT
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Aplicação rodando na porta ${port}`);
  console.log(`📚 Documentação disponível em: ${process.env.NODE_ENV !== 'production' ? `http://localhost:${port}/api/docs` : 'Desabilitada em produção'}`);
}

void bootstrap();
