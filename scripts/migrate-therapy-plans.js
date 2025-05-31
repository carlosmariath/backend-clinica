const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  try {
    console.log('Iniciando migração de dados...');
    
    // Busca os planos no banco
    const plans = await prisma.therapyPlan.findMany();
    console.log(`Encontrados ${plans.length} planos para migrar.`);
    
    // Busca as filiais existentes
    const branches = await prisma.branch.findMany();
    console.log(`Encontradas ${branches.length} filiais disponíveis.`);
    
    if (branches.length === 0) {
      console.log('Nenhuma filial encontrada para associar aos planos!');
      return;
    }
    
    // Para cada plano, associar com a primeira filial
    const defaultBranchId = branches[0].id;
    console.log(`Usando filial padrão ID: ${defaultBranchId}`);
    
    // Criar associações para todos os planos
    for (const plan of plans) {
      console.log(`Associando plano ${plan.id} (${plan.name}) à filial padrão...`);
      
      // Verificar se já existe associação
      const existingAssociation = await prisma.therapyPlanBranch.findFirst({
        where: {
          therapyPlanId: plan.id,
          branchId: defaultBranchId
        }
      });
      
      if (!existingAssociation) {
        await prisma.therapyPlanBranch.create({
          data: {
            therapyPlanId: plan.id,
            branchId: defaultBranchId
          }
        });
        console.log('  Associação criada com sucesso!');
      } else {
        console.log('  Associação já existe, pulando...');
      }
    }
    
    console.log('Migração de dados concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData(); 