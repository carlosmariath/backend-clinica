import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(AppConfigService);

  // Validate configuration
  try {
    configService.validateConfig();
    configService.logConfiguration();
  } catch (error) {
    console.error(
      '❌ Configuration validation failed:',
      (error as Error).message,
    );
    process.exit(1);
  }

  // Configurar CORS
  app.enableCors({
    origin: configService.corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configurar validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configurar Swagger apenas em desenvolvimento
  if (configService.nodeEnv !== 'production') {
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

  const port = configService.port;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Aplicação rodando na porta ${port}`);
  console.log(`🌍 Ambiente: ${configService.nodeEnv}`);
  console.log(
    `📚 Documentação: ${configService.nodeEnv !== 'production' ? `http://localhost:${port}/api/docs` : 'Desabilitada em produção'}`,
  );
}

void bootstrap();
