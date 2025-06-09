import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFinancialCategories() {
  console.log('🌱 Iniciando seed das categorias financeiras em português...');

  // Categorias de Receita (REVENUE)
  const revenueCategories = [
    {
      name: 'Consultas e Sessões',
      type: TransactionType.REVENUE,
      description: 'Receitas provenientes de consultas e sessões de terapia'
    },
    {
      name: 'Vendas de Planos',
      type: TransactionType.REVENUE,
      description: 'Receitas de vendas de planos de terapia e pacotes de sessões'
    },
    {
      name: 'Taxa de No-Show',
      type: TransactionType.REVENUE,
      description: 'Taxas cobradas por não comparecimento às sessões agendadas'
    },
    {
      name: 'Serviços Especializados',
      type: TransactionType.REVENUE,
      description: 'Receitas de serviços especializados e tratamentos específicos'
    },
    {
      name: 'Produtos Terapêuticos',
      type: TransactionType.REVENUE,
      description: 'Vendas de produtos relacionados à terapia e bem-estar'
    },
    {
      name: 'Outras Receitas',
      type: TransactionType.REVENUE,
      description: 'Outras fontes de receita não categorizadas'
    }
  ];

  // Categorias de Despesa (EXPENSE)
  const expenseCategories = [
    {
      name: 'Recursos Humanos',
      type: TransactionType.EXPENSE,
      description: 'Salários, benefícios e custos relacionados aos funcionários'
    },
    {
      name: 'Aluguel e Infraestrutura',
      type: TransactionType.EXPENSE,
      description: 'Aluguel, condomínio, água, luz, internet e manutenção predial'
    },
    {
      name: 'Equipamentos e Materiais',
      type: TransactionType.EXPENSE,
      description: 'Compra e manutenção de equipamentos, materiais de escritório e terapêuticos'
    },
    {
      name: 'Marketing e Publicidade',
      type: TransactionType.EXPENSE,
      description: 'Investimentos em marketing, publicidade e divulgação'
    },
    {
      name: 'Software e Tecnologia',
      type: TransactionType.EXPENSE,
      description: 'Licenças de software, sistemas de gestão e ferramentas tecnológicas'
    },
    {
      name: 'Impostos e Taxas',
      type: TransactionType.EXPENSE,
      description: 'Impostos, taxas governamentais e tributos'
    },
    {
      name: 'Capacitação e Cursos',
      type: TransactionType.EXPENSE,
      description: 'Cursos, treinamentos e capacitação profissional'
    },
    {
      name: 'Serviços Profissionais',
      type: TransactionType.EXPENSE,
      description: 'Contabilidade, advocacia, consultoria e outros serviços profissionais'
    },
    {
      name: 'Estornos e Reembolsos',
      type: TransactionType.EXPENSE,
      description: 'Estornos de pagamentos e reembolsos de clientes'
    },
    {
      name: 'Outras Despesas',
      type: TransactionType.EXPENSE,
      description: 'Outras despesas operacionais não categorizadas'
    }
  ];

  try {
    // Remover categorias existentes (opcional - descomente se quiser limpar antes)
    // await prisma.financeCategory.deleteMany({});
    // console.log('🗑️ Categorias existentes removidas');

    // Inserir categorias de receita
    for (const category of revenueCategories) {
      await prisma.financeCategory.upsert({
        where: { name: category.name },
        update: category,
        create: category,
      });
    }
    console.log(`✅ ${revenueCategories.length} categorias de receita inseridas/atualizadas`);

    // Inserir categorias de despesa
    for (const category of expenseCategories) {
      await prisma.financeCategory.upsert({
        where: { name: category.name },
        update: category,
        create: category,
      });
    }
    console.log(`✅ ${expenseCategories.length} categorias de despesa inseridas/atualizadas`);

    console.log('🎉 Seed das categorias financeiras concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar seed das categorias:', error);
    throw error;
  }
}

async function seedPaymentMethods() {
  console.log('🌱 Iniciando seed dos métodos de pagamento...');

  const paymentMethods = [
    {
      name: 'Dinheiro',
      description: 'Pagamentos em espécie',
      isActive: true
    },
    {
      name: 'PIX',
      description: 'Pagamentos via PIX',
      isActive: true
    },
    {
      name: 'Cartão de Crédito',
      description: 'Pagamentos com cartão de crédito',
      isActive: true
    },
    {
      name: 'Cartão de Débito',
      description: 'Pagamentos com cartão de débito',
      isActive: true
    },
    {
      name: 'Transferência Bancária',
      description: 'Transferências bancárias (TED/DOC)',
      isActive: true
    },
    {
      name: 'Boleto Bancário',
      description: 'Pagamentos via boleto bancário',
      isActive: true
    },
    {
      name: 'Cheque',
      description: 'Pagamentos via cheque',
      isActive: false
    },
    {
      name: 'Carteira Digital',
      description: 'Pagamentos via carteiras digitais (PicPay, Mercado Pago, etc.)',
      isActive: true
    }
  ];

  try {
    for (const method of paymentMethods) {
      await prisma.paymentMethod.upsert({
        where: { name: method.name },
        update: method,
        create: method,
      });
    }
    console.log(`✅ ${paymentMethods.length} métodos de pagamento inseridos/atualizados`);
    console.log('🎉 Seed dos métodos de pagamento concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar seed dos métodos:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedFinancialCategories();
    await seedPaymentMethods();
  } catch (error) {
    console.error('❌ Erro geral no seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedFinancialCategories, seedPaymentMethods };