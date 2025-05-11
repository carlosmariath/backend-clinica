import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateFinanceCategoryDto } from './dto/create-category.dto';
import { UpdateFinanceCategoryDto } from './dto/update-category.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { Prisma } from '@prisma/client';

// Definir explicitamente o enum
enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // =========== TRANSAÇÕES FINANCEIRAS ===========

  async createTransaction(createTransactionDto: CreateTransactionDto) {
    // Verificar se a categoria existe, se fornecida
    if (createTransactionDto.financeCategoryId) {
      const category = await this.prisma.financeCategory.findUnique({
        where: { id: createTransactionDto.financeCategoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Categoria financeira com ID ${createTransactionDto.financeCategoryId} não encontrada`,
        );
      }

      // Verificar se o tipo da transação corresponde ao tipo da categoria
      if (category.type !== createTransactionDto.type) {
        throw new BadRequestException(
          `O tipo da transação (${createTransactionDto.type}) não corresponde ao tipo da categoria (${category.type})`,
        );
      }
    }

    // Verificar se o método de pagamento existe, se fornecido
    if (createTransactionDto.paymentMethodId) {
      const method = await this.prisma.paymentMethod.findUnique({
        where: { id: createTransactionDto.paymentMethodId },
      });

      if (!method) {
        throw new NotFoundException(
          `Método de pagamento com ID ${createTransactionDto.paymentMethodId} não encontrado`,
        );
      }

      if (!method.isActive) {
        throw new BadRequestException(
          `O método de pagamento selecionado não está ativo`,
        );
      }
    }

    // Criar a transação
    return this.prisma.financialTransaction.create({
      data: {
        ...createTransactionDto,
        date: new Date(createTransactionDto.date),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: true,
        paymentMethod: true,
        financeCategory: true,
      },
    });
  }

  async findAllTransactions(
    startDate?: string,
    endDate?: string,
    type?: TransactionType,
    clientId?: string,
    branchId?: string,
    categoryId?: string,
  ) {
    // Construir filtros com base nos parâmetros recebidos
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.date = {
        lte: new Date(endDate),
      };
    }

    if (type) {
      where.type = type;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (categoryId) {
      where.financeCategoryId = categoryId;
    }

    // Buscar transações com filtros aplicados
    return this.prisma.financialTransaction.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: true,
        paymentMethod: true,
        financeCategory: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findTransactionById(id: string) {
    const transaction = await this.prisma.financialTransaction.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: true,
        paymentMethod: true,
        financeCategory: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transação com ID ${id} não encontrada`);
    }

    return transaction;
  }

  async updateTransaction(id: string, updateTransactionDto: UpdateTransactionDto) {
    // Verificar se a transação existe
    await this.findTransactionById(id);

    // Verificar se está tentando alterar a categoria
    if (updateTransactionDto.financeCategoryId) {
      const category = await this.prisma.financeCategory.findUnique({
        where: { id: updateTransactionDto.financeCategoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Categoria financeira com ID ${updateTransactionDto.financeCategoryId} não encontrada`,
        );
      }

      // Se está tentando alterar o tipo, verificar compatibilidade com a categoria
      if (updateTransactionDto.type && category.type !== updateTransactionDto.type) {
        throw new BadRequestException(
          `O tipo da transação (${updateTransactionDto.type}) não corresponde ao tipo da categoria (${category.type})`,
        );
      }
    }

    // Verificar método de pagamento, se fornecido
    if (updateTransactionDto.paymentMethodId) {
      const method = await this.prisma.paymentMethod.findUnique({
        where: { id: updateTransactionDto.paymentMethodId },
      });

      if (!method) {
        throw new NotFoundException(
          `Método de pagamento com ID ${updateTransactionDto.paymentMethodId} não encontrado`,
        );
      }

      if (!method.isActive) {
        throw new BadRequestException(
          `O método de pagamento selecionado não está ativo`,
        );
      }
    }

    // Preparar os dados para atualização
    const data: any = { ...updateTransactionDto };
    if (updateTransactionDto.date) {
      data.date = new Date(updateTransactionDto.date);
    }

    // Atualizar a transação
    return this.prisma.financialTransaction.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: true,
        paymentMethod: true,
        financeCategory: true,
      },
    });
  }

  async removeTransaction(id: string) {
    // Verificar se a transação existe
    await this.findTransactionById(id);

    // Remover a transação
    return this.prisma.financialTransaction.delete({
      where: { id },
    });
  }

  // =========== CATEGORIAS FINANCEIRAS ===========

  async createCategory(createCategoryDto: CreateFinanceCategoryDto) {
    // Verificar se já existe uma categoria com o mesmo nome
    const existingCategory = await this.prisma.financeCategory.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new BadRequestException(
        `Já existe uma categoria financeira com o nome '${createCategoryDto.name}'`,
      );
    }

    // Criar a categoria
    return this.prisma.financeCategory.create({
      data: createCategoryDto,
    });
  }

  async findAllCategories(type?: TransactionType) {
    const where = type ? { type } : {};

    return this.prisma.financeCategory.findMany({
      where,
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findCategoryById(id: string) {
    const category = await this.prisma.financeCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoria financeira com ID ${id} não encontrada`);
    }

    return category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateFinanceCategoryDto) {
    // Verificar se a categoria existe
    await this.findCategoryById(id);

    // Verificar se está tentando alterar o nome e se o novo nome já existe
    if (updateCategoryDto.name) {
      const existingCategory = await this.prisma.financeCategory.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new BadRequestException(
          `Já existe uma categoria financeira com o nome '${updateCategoryDto.name}'`,
        );
      }
    }

    // Atualizar a categoria
    return this.prisma.financeCategory.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async removeCategory(id: string) {
    // Verificar se a categoria existe
    const category = await this.findCategoryById(id);

    // Verificar se há transações associadas a esta categoria
    const transactionCount = category._count?.transactions || 0;
    if (transactionCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir esta categoria pois existem ${transactionCount} transações associadas a ela`,
      );
    }

    // Remover a categoria
    return this.prisma.financeCategory.delete({
      where: { id },
    });
  }

  // =========== MÉTODOS DE PAGAMENTO ===========

  async createPaymentMethod(createMethodDto: CreatePaymentMethodDto) {
    // Verificar se já existe um método com o mesmo nome
    const existingMethod = await this.prisma.paymentMethod.findUnique({
      where: { name: createMethodDto.name },
    });

    if (existingMethod) {
      throw new BadRequestException(
        `Já existe um método de pagamento com o nome '${createMethodDto.name}'`,
      );
    }

    // Criar o método
    return this.prisma.paymentMethod.create({
      data: {
        ...createMethodDto,
        isActive: createMethodDto.isActive ?? true,
      },
    });
  }

  async findAllPaymentMethods(onlyActive = false) {
    const where = onlyActive ? { isActive: true } : {};

    return this.prisma.paymentMethod.findMany({
      where,
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findPaymentMethodById(id: string) {
    const method = await this.prisma.paymentMethod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!method) {
      throw new NotFoundException(`Método de pagamento com ID ${id} não encontrado`);
    }

    return method;
  }

  async updatePaymentMethod(id: string, updateMethodDto: UpdatePaymentMethodDto) {
    // Verificar se o método existe
    await this.findPaymentMethodById(id);

    // Verificar se está tentando alterar o nome e se o novo nome já existe
    if (updateMethodDto.name) {
      const existingMethod = await this.prisma.paymentMethod.findUnique({
        where: { name: updateMethodDto.name },
      });

      if (existingMethod && existingMethod.id !== id) {
        throw new BadRequestException(
          `Já existe um método de pagamento com o nome '${updateMethodDto.name}'`,
        );
      }
    }

    // Atualizar o método
    return this.prisma.paymentMethod.update({
      where: { id },
      data: updateMethodDto,
    });
  }

  async removePaymentMethod(id: string) {
    // Verificar se o método existe
    const method = await this.findPaymentMethodById(id);

    // Verificar se há transações associadas a este método
    const transactionCount = method._count?.transactions || 0;
    if (transactionCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir este método pois existem ${transactionCount} transações associadas a ele`,
      );
    }

    // Remover o método
    return this.prisma.paymentMethod.delete({
      where: { id },
    });
  }

  // =========== RELATÓRIOS FINANCEIROS ===========

  async getFinancialSummary(
    startDate?: string,
    endDate?: string,
    branchId?: string,
  ) {
    // Construir filtros com base nos parâmetros recebidos
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.date = {
        lte: new Date(endDate),
      };
    }

    if (branchId) {
      where.branchId = branchId;
    }

    // Buscar todas as transações do período
    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        category: true,
        date: true,
        financeCategory: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    // Calcular totais de receitas e despesas
    const totalRevenue = transactions
      .filter(t => t.type === TransactionType.REVENUE)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalRevenue - totalExpense;

    // Agrupar transações por categoria
    const byCategory = transactions.reduce((acc: any, transaction) => {
      const categoryName = transaction.financeCategory?.name || transaction.category;
      const type = transaction.type;
      
      if (!acc[type]) {
        acc[type] = {};
      }
      
      if (!acc[type][categoryName]) {
        acc[type][categoryName] = {
          total: 0,
          count: 0,
        };
      }
      
      acc[type][categoryName].total += transaction.amount;
      acc[type][categoryName].count += 1;
      
      return acc;
    }, {});

    // Formatar para o retorno
    return {
      totalRevenue,
      totalExpense,
      balance,
      byCategory,
      transactionCount: transactions.length,
      period: {
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null,
      },
    };
  }
} 