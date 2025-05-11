import { PrismaClient } from '@prisma/client';

/**
 * Este script cria uma filial padrão e associa todos os registros existentes a ela.
 * Útil para migrar de um sistema sem filiais para um sistema com filiais.
 */
async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Iniciando migração para adicionar filial padrão...');
    
    // 1. Criar filial padrão
    const defaultBranch = await prisma.branch.create({
      data: {
        name: 'Matriz',
        address: 'Av. Principal, 123 - Centro',
        phone: '(11) 1234-5678',
        email: 'contato@clinica.com',
        isActive: true,
      },
    });
    
    console.log(`Filial padrão criada com ID: ${defaultBranch.id}`);
    
    // 2. Criar relações entre terapeutas existentes e a filial padrão
    const therapists = await prisma.therapist.findMany();
    for (const therapist of therapists) {
      await prisma.therapistBranch.create({
        data: {
          therapistId: therapist.id,
          branchId: defaultBranch.id,
        }
      });
    }
    
    console.log(`${therapists.length} terapeutas associados à filial padrão`);
    
    // 3. Associar agendamentos existentes à filial padrão
    const updateAppointments = await prisma.appointment.updateMany({
      where: {
        branchId: null,
      },
      data: {
        branchId: defaultBranch.id,
      },
    });
    
    console.log(`${updateAppointments.count} agendamentos associados à filial padrão`);
    
    // 4. Associar usuários existentes à filial padrão
    const updateUsers = await prisma.user.updateMany({
      where: {
        branchId: null,
      },
      data: {
        branchId: defaultBranch.id,
      },
    });
    
    console.log(`${updateUsers.count} usuários associados à filial padrão`);
    
    // 5. Associar serviços existentes à filial padrão
    const updateServices = await prisma.service.updateMany({
      where: {
        branchId: null,
      },
      data: {
        branchId: defaultBranch.id,
      },
    });
    
    console.log(`${updateServices.count} serviços associados à filial padrão`);
    
    console.log('Migração concluída com sucesso.');
  } catch (error) {
    console.error('Erro durante a migração:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa o script
main()
  .then(() => console.log('Script de migração executado com sucesso'))
  .catch((e) => {
    console.error('Erro na execução do script:');
    console.error(e);
    process.exit(1);
  }); 