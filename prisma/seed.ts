import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  // Criar filial padrão
  console.log('Criando filial padrão...');
  const defaultBranch = await prisma.branch.create({
    data: {
      name: 'Matriz',
      address: 'Av. Principal, 123 - Centro',
      phone: '(11) 1234-5678',
      email: 'contato@clinica.com',
      isActive: true,
    },
  });
  
  // Criar usuários
  const adminPassword = await bcrypt.hash('admin123', 10);
  const therapistPassword = await bcrypt.hash('terapeuta123', 10);
  const receptionistPassword = await bcrypt.hash('recepcao123', 10);
  const clientPassword = await bcrypt.hash('cliente123', 10);

  console.log('Criando usuários...');
  
  // Administrador
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@clinica.com',
      password: adminPassword,
      phone: '11999990000',
      role: Role.ADMIN,
    },
  });

  // Recepcionista
  await prisma.user.upsert({
    where: { email: 'recepcao@clinica.com' },
    update: {},
    create: {
      name: 'Recepcionista',
      email: 'recepcao@clinica.com',
      password: receptionistPassword,
      phone: '11999991111',
      role: Role.RECEPTIONIST,
    },
  });

  // Terapeuta (como usuário)
  await prisma.user.upsert({
    where: { email: 'terapeuta@clinica.com' },
    update: {},
    create: {
      name: 'Teresa Terapeuta',
      email: 'terapeuta@clinica.com',
      password: therapistPassword,
      phone: '11999992222',
      role: Role.THERAPIST,
    },
  });

  // Cliente
  await prisma.user.upsert({
    where: { email: 'cliente@email.com' },
    update: {},
    create: {
      name: 'Carlos Cliente',
      email: 'cliente@email.com',
      password: clientPassword,
      phone: '11999993333',
      role: Role.CLIENT,
    },
  });

  console.log('Criando terapeutas...');
  
  // Terapeutas
  const therapist1 = await prisma.therapist.upsert({
    where: { email: 'terapeuta@clinica.com' },
    update: {},
    create: {
      name: 'Teresa Terapeuta',
      email: 'terapeuta@clinica.com',
      phone: '11999992222',
      specialty: 'Terapia Cognitivo-Comportamental',
    },
  });

  const therapist2 = await prisma.therapist.upsert({
    where: { email: 'julia@clinica.com' },
    update: {},
    create: {
      name: 'Júlia Santos',
      email: 'julia@clinica.com',
      phone: '11999994444',
      specialty: 'Psicanálise',
    },
  });

  // Associar terapeutas à filial padrão
  await prisma.therapistBranch.createMany({
    data: [
      { therapistId: therapist1.id, branchId: defaultBranch.id },
      { therapistId: therapist2.id, branchId: defaultBranch.id }
    ],
    skipDuplicates: true,
  });

  console.log('Criando horários para terapeutas...');
  
  // Horários para Teresa (segunda a sexta, 9h às 17h)
  for (let day = 1; day <= 5; day++) {
    await prisma.schedule.create({
      data: {
        therapistId: therapist1.id,
        branchId: defaultBranch.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
      },
    });
  }

  // Horários para Júlia (terça, quinta e sábado, 10h às 18h)
  for (const day of [2, 4, 6]) {
    await prisma.schedule.create({
      data: {
        therapistId: therapist2.id,
        branchId: defaultBranch.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '18:00',
      },
    });
  }

  console.log('Criando categorias de conhecimento...');
  
  // Categorias de Conhecimento
  const generalCategory = await prisma.knowledgeCategory.upsert({
    where: { name: 'Geral' },
    update: {},
    create: {
      name: 'Geral',
      description: 'Informações gerais sobre a clínica',
    },
  });

  const therapiesCategory = await prisma.knowledgeCategory.upsert({
    where: { name: 'Terapias' },
    update: {},
    create: {
      name: 'Terapias',
      description: 'Informações sobre tipos de terapias disponíveis',
    },
  });

  const appointmentsCategory = await prisma.knowledgeCategory.upsert({
    where: { name: 'Agendamentos' },
    update: {},
    create: {
      name: 'Agendamentos',
      description: 'Dúvidas sobre processo de agendamento',
    },
  });

  console.log('Criando entradas na base de conhecimento...');
  
  // Entradas na Base de Conhecimento
  await prisma.knowledgeBase.upsert({
    where: { question: 'Quais são os horários de funcionamento da clínica?' },
    update: {},
    create: {
      question: 'Quais são os horários de funcionamento da clínica?',
      answer: 'A clínica funciona de segunda a sexta, das 8h às 19h, e aos sábados das 9h às 17h.',
      categoryId: generalCategory.id,
      tags: ['horários', 'funcionamento', 'atendimento'],
      createdBy: admin.id,
    },
  });

  await prisma.knowledgeBase.upsert({
    where: { question: 'Como funciona a Terapia Cognitivo-Comportamental?' },
    update: {},
    create: {
      question: 'Como funciona a Terapia Cognitivo-Comportamental?',
      answer: 'A Terapia Cognitivo-Comportamental (TCC) é uma abordagem que foca na identificação e mudança de padrões de pensamento negativos. As sessões são estruturadas e orientadas para soluções práticas, trabalhando com situações do presente.',
      categoryId: therapiesCategory.id,
      tags: ['TCC', 'terapia', 'abordagem'],
      createdBy: admin.id,
    },
  });

  await prisma.knowledgeBase.upsert({
    where: { question: 'Como posso marcar ou desmarcar uma consulta?' },
    update: {},
    create: {
      question: 'Como posso marcar ou desmarcar uma consulta?',
      answer: 'Você pode marcar uma consulta através do nosso site, aplicativo ou ligando para a recepção. Para desmarcar, acesse sua área de cliente no site/app ou contate a recepção com pelo menos 24h de antecedência para evitar taxas de cancelamento.',
      categoryId: appointmentsCategory.id,
      tags: ['agendamento', 'consulta', 'cancelamento'],
      createdBy: admin.id,
    },
  });

  console.log('Criando perguntas frequentes...');
  
  // Perguntas Frequentes
  await prisma.frequentQuestion.create({
    data: {
      question: 'Qual o valor da consulta?',
      count: 42,
      autoDetected: true,
    },
  });

  await prisma.frequentQuestion.create({
    data: {
      question: 'Vocês atendem planos de saúde?',
      count: 37,
      autoDetected: true,
    },
  });

  await prisma.frequentQuestion.create({
    data: {
      question: 'Como sei qual terapeuta é o mais adequado para mim?',
      count: 23,
      autoDetected: true,
    },
  });

  console.log('Criando serviços...');
  // Serviços
  const service1 = await prisma.service.upsert({
    where: { name: 'Terapia Individual' },
    update: {},
    create: {
      name: 'Terapia Individual',
      description: 'Sessão de terapia individual',
      price: 200.0,
      branchId: defaultBranch.id,
    },
  });
  const service2 = await prisma.service.upsert({
    where: { name: 'Terapia de Casal' },
    update: {},
    create: {
      name: 'Terapia de Casal',
      description: 'Sessão de terapia para casais',
      price: 300.0,
      branchId: defaultBranch.id,
    },
  });
  const service3 = await prisma.service.upsert({
    where: { name: 'Psicanálise' },
    update: {},
    create: {
      name: 'Psicanálise',
      description: 'Sessão de psicanálise',
      price: 250.0,
      branchId: defaultBranch.id,
    },
  });

  console.log('Associando serviços aos terapeutas...');
  // Teresa: Terapia Individual e Terapia de Casal
  await prisma.therapistService.createMany({
    data: [
      { therapistId: therapist1.id, serviceId: service1.id },
      { therapistId: therapist1.id, serviceId: service2.id },
    ],
    skipDuplicates: true,
  });
  // Júlia: Terapia Individual e Psicanálise
  await prisma.therapistService.createMany({
    data: [
      { therapistId: therapist2.id, serviceId: service1.id },
      { therapistId: therapist2.id, serviceId: service3.id },
    ],
    skipDuplicates: true,
  });

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 