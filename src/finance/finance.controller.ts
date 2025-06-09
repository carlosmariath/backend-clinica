import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateFinanceCategoryDto } from './dto/create-category.dto';
import { UpdateFinanceCategoryDto } from './dto/update-category.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Enum para tipos de transação financeira
enum TransactionType {
  REVENUE = 'REVENUE', // Receitas
  EXPENSE = 'EXPENSE'  // Despesas
}

@ApiTags('Finanças')
@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // =========== GESTÃO DE TRANSAÇÕES FINANCEIRAS ===========

  @Post('transactions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Registrar nova transação financeira', description: 'Cria uma nova transação de receita ou despesa no sistema' })
  createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    return this.financeService.createTransaction(createTransactionDto);
  }

  @Get('transactions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar transações financeiras', description: 'Obtém lista de transações com filtros opcionais por período, tipo, cliente, filial ou categoria' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial para filtro (formato: YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final para filtro (formato: YYYY-MM-DD)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo: REVENUE (receitas) ou EXPENSE (despesas)' })
  @ApiQuery({ name: 'clientId', required: false, description: 'ID do cliente para filtrar transações específicas' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID da filial para filtrar transações específicas' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID da categoria financeira para filtrar transações' })
  findAllTransactions(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: TransactionType,
    @Query('clientId') clientId?: string,
    @Query('branchId') branchId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.financeService.findAllTransactions(
      startDate,
      endDate,
      type,
      clientId,
      branchId,
      categoryId,
    );
  }

  @Get('transactions/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Detalhar transação financeira', description: 'Obtém detalhes completos de uma transação específica' })
  @ApiParam({ name: 'id', description: 'ID único da transação financeira' })
  findTransactionById(@Param('id') id: string) {
    return this.financeService.findTransactionById(id);
  }

  @Patch('transactions/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar transação financeira', description: 'Modifica dados de uma transação existente' })
  @ApiParam({ name: 'id', description: 'ID único da transação financeira' })
  updateTransaction(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.financeService.updateTransaction(id, updateTransactionDto);
  }

  @Delete('transactions/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Excluir transação financeira', description: 'Remove permanentemente uma transação do sistema' })
  @ApiParam({ name: 'id', description: 'ID único da transação financeira' })
  removeTransaction(@Param('id') id: string) {
    return this.financeService.removeTransaction(id);
  }

  // =========== GESTÃO DE CATEGORIAS FINANCEIRAS ===========

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar categoria financeira', description: 'Cria uma nova categoria para classificação de receitas ou despesas' })
  createCategory(@Body() createCategoryDto: CreateFinanceCategoryDto) {
    return this.financeService.createCategory(createCategoryDto);
  }

  @Get('categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar categorias financeiras', description: 'Obtém lista de categorias disponíveis, com filtro opcional por tipo' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar categorias por tipo: REVENUE (receitas) ou EXPENSE (despesas)' })
  findAllCategories(@Query('type') type?: TransactionType) {
    return this.financeService.findAllCategories(type);
  }

  @Get('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Detalhar categoria financeira', description: 'Obtém detalhes de uma categoria específica incluindo estatísticas de uso' })
  @ApiParam({ name: 'id', description: 'ID único da categoria financeira' })
  findCategoryById(@Param('id') id: string) {
    return this.financeService.findCategoryById(id);
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar categoria financeira', description: 'Modifica dados de uma categoria existente' })
  @ApiParam({ name: 'id', description: 'ID único da categoria financeira' })
  updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateFinanceCategoryDto,
  ) {
    return this.financeService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Excluir categoria financeira', description: 'Remove categoria (apenas se não houver transações associadas)' })
  @ApiParam({ name: 'id', description: 'ID único da categoria financeira' })
  removeCategory(@Param('id') id: string) {
    return this.financeService.removeCategory(id);
  }

  // =========== GESTÃO DE MÉTODOS DE PAGAMENTO ===========

  @Post('payment-methods')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar método de pagamento', description: 'Adiciona novo método de pagamento ao sistema' })
  createPaymentMethod(@Body() createMethodDto: CreatePaymentMethodDto) {
    return this.financeService.createPaymentMethod(createMethodDto);
  }

  @Get('payment-methods')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar métodos de pagamento', description: 'Obtém lista de métodos disponíveis, com filtro opcional por status ativo' })
  @ApiQuery({ name: 'onlyActive', required: false, description: 'Mostrar apenas métodos ativos (true/false)', type: 'boolean' })
  findAllPaymentMethods(@Query('onlyActive') onlyActive?: string) {
    return this.financeService.findAllPaymentMethods(onlyActive === 'true');
  }

  @Get('payment-methods/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Detalhar método de pagamento', description: 'Obtém detalhes de um método específico incluindo estatísticas de uso' })
  @ApiParam({ name: 'id', description: 'ID único do método de pagamento' })
  findPaymentMethodById(@Param('id') id: string) {
    return this.financeService.findPaymentMethodById(id);
  }

  @Patch('payment-methods/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar método de pagamento', description: 'Modifica dados de um método existente ou altera status de ativo/inativo' })
  @ApiParam({ name: 'id', description: 'ID único do método de pagamento' })
  updatePaymentMethod(
    @Param('id') id: string,
    @Body() updateMethodDto: UpdatePaymentMethodDto,
  ) {
    return this.financeService.updatePaymentMethod(id, updateMethodDto);
  }

  @Delete('payment-methods/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Excluir método de pagamento', description: 'Remove método (apenas se não houver transações associadas)' })
  @ApiParam({ name: 'id', description: 'ID único do método de pagamento' })
  removePaymentMethod(@Param('id') id: string) {
    return this.financeService.removePaymentMethod(id);
  }

  // =========== RELATÓRIOS E ANÁLISES FINANCEIRAS ===========

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Relatório resumo financeiro', description: 'Gera resumo com totais de receitas, despesas e balanço por período e filial' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial para filtro (formato: YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final para filtro (formato: YYYY-MM-DD)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID da filial para filtrar transações específicas' })
  getFinancialSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.financeService.getFinancialSummary(startDate, endDate, branchId);
  }
} 