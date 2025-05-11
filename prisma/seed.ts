import { PrismaClient, Role, TransactionType } from '@prisma/client';
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
  const client = await prisma.user.upsert({
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

  // ====================== NOVOS DADOS PARA PLANOS E FINANÇAS ======================

  console.log('Criando métodos de pagamento...');
  
  // Criar métodos de pagamento padrão
  const pixMethod = await prisma.paymentMethod.create({
    data: {
      name: 'PIX',
      description: 'Pagamento via PIX',
      isActive: true,
    },
  });
  
  const creditCardMethod = await prisma.paymentMethod.create({
    data: {
      name: 'Cartão de Crédito',
      description: 'Pagamento com cartão de crédito',
      isActive: true,
    },
  });
  
  const debitCardMethod = await prisma.paymentMethod.create({
    data: {
      name: 'Cartão de Débito',
      description: 'Pagamento com cartão de débito',
      isActive: true,
    },
  });
  
  const cashMethod = await prisma.paymentMethod.create({
    data: {
      name: 'Dinheiro',
      description: 'Pagamento em espécie',
      isActive: true,
    },
  });

  console.log('Criando categorias financeiras...');
  
  // Criar categorias financeiras
  const serviceSaleCategory = await prisma.financeCategory.create({
    data: {
      name: 'Venda de Serviços',
      type: TransactionType.REVENUE,
      description: 'Receitas provenientes de serviços prestados',
    },
  });
  
  const planSaleCategory = await prisma.financeCategory.create({
    data: {
      name: 'Venda de Planos',
      type: TransactionType.REVENUE,
      description: 'Receitas provenientes de venda de planos de terapia',
    },
  });
  
  const operationalExpenseCategory = await prisma.financeCategory.create({
    data: {
      name: 'Despesas Operacionais',
      type: TransactionType.EXPENSE,
      description: 'Gastos relacionados à operação da clínica',
    },
  });
  
  const salariesCategory = await prisma.financeCategory.create({
    data: {
      name: 'Salários',
      type: TransactionType.EXPENSE,
      description: 'Pagamentos de salários e comissões',
    },
  });

  console.log('Criando planos de terapia...');
  
  // Criar planos de terapia
  const basicPlan = await prisma.therapyPlan.create({
    data: {
      name: 'Plano Básico',
      description: 'Plano básico com 4 sessões',
      totalSessions: 4,
      totalPrice: 760.00, // 4 sessões com desconto
      validityDays: 60, // 2 meses
      isActive: true,
      branchId: defaultBranch.id,
    },
  });
  
  const standardPlan = await prisma.therapyPlan.create({
    data: {
      name: 'Plano Padrão',
      description: 'Plano padrão com 8 sessões',
      totalSessions: 8,
      totalPrice: 1440.00, // 8 sessões com desconto
      validityDays: 90, // 3 meses
      isActive: true,
      branchId: defaultBranch.id,
    },
  });
  
  const premiumPlan = await prisma.therapyPlan.create({
    data: {
      name: 'Plano Premium',
      description: 'Plano premium com 12 sessões',
      totalSessions: 12,
      totalPrice: 2040.00, // 12 sessões com desconto maior
      validityDays: 120, // 4 meses
      isActive: true,
      branchId: defaultBranch.id,
    },
  });

  console.log('Criando uma assinatura de exemplo para o cliente...');
  
  // Criar uma assinatura de plano para o cliente
  const subscription = await prisma.subscription.create({
    data: {
      planId: standardPlan.id,
      clientId: client.id,
      branchId: defaultBranch.id,
      status: 'ACTIVE',
      token: 'token-exemplo-12345',
      tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias no futuro
      acceptedAt: new Date(),
      sessionsLeft: 8, // Começa com todas as sessões do plano
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias no futuro
    },
  });

  console.log('Criando transações financeiras...');
  
  // Criar transações financeiras
  // Transação para a venda do plano
  await prisma.financialTransaction.create({
    data: {
      type: TransactionType.REVENUE,
      amount: standardPlan.totalPrice,
      description: `Venda de Plano Padrão para ${client.name}`,
      category: 'Venda de Plano',
      date: new Date(),
      clientId: client.id,
      branchId: defaultBranch.id,
      paymentMethodId: creditCardMethod.id,
      financeCategoryId: planSaleCategory.id,
      reference: subscription.id,
      referenceType: 'subscription',
    },
  });
  
  // Despesa operacional
  await prisma.financialTransaction.create({
    data: {
      type: TransactionType.EXPENSE,
      amount: 350.00,
      description: 'Aluguel do espaço',
      category: 'Aluguel',
      date: new Date(),
      branchId: defaultBranch.id,
      paymentMethodId: pixMethod.id,
      financeCategoryId: operationalExpenseCategory.id,
    },
  });
  
  // Despesa com salário
  await prisma.financialTransaction.create({
    data: {
      type: TransactionType.EXPENSE,
      amount: 2800.00,
      description: 'Pagamento de terapeuta',
      category: 'Salários',
      date: new Date(),
      branchId: defaultBranch.id,
      paymentMethodId: pixMethod.id,
      financeCategoryId: salariesCategory.id,
    },
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