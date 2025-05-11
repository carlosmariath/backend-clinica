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

// Definir explicitamente o enum
enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // =========== TRANSAÇÕES FINANCEIRAS ===========

  @Post('transactions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar uma nova transação financeira' })
  createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    return this.financeService.createTransaction(createTransactionDto);
  }

  @Get('transactions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar todas as transações financeiras' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (YYYY-MM-DD)' })
  @ApiQuery({ name: 'type', required: false, description: 'Tipo de transação (REVENUE/EXPENSE)' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filtrar por cliente' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por filial' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filtrar por categoria' })
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
  @ApiOperation({ summary: 'Obter uma transação específica' })
  @ApiParam({ name: 'id', description: 'ID da transação' })
  findTransactionById(@Param('id') id: string) {
    return this.financeService.findTransactionById(id);
  }

  @Patch('transactions/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar uma transação' })
  @ApiParam({ name: 'id', description: 'ID da transação' })
  updateTransaction(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.financeService.updateTransaction(id, updateTransactionDto);
  }

  @Delete('transactions/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover uma transação' })
  @ApiParam({ name: 'id', description: 'ID da transação' })
  removeTransaction(@Param('id') id: string) {
    return this.financeService.removeTransaction(id);
  }

  // =========== CATEGORIAS FINANCEIRAS ===========

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar uma nova categoria financeira' })
  createCategory(@Body() createCategoryDto: CreateFinanceCategoryDto) {
    return this.financeService.createCategory(createCategoryDto);
  }

  @Get('categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar todas as categorias financeiras' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo (REVENUE/EXPENSE)' })
  findAllCategories(@Query('type') type?: TransactionType) {
    return this.financeService.findAllCategories(type);
  }

  @Get('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obter uma categoria específica' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  findCategoryById(@Param('id') id: string) {
    return this.financeService.findCategoryById(id);
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar uma categoria' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateFinanceCategoryDto,
  ) {
    return this.financeService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover uma categoria' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  removeCategory(@Param('id') id: string) {
    return this.financeService.removeCategory(id);
  }

  // =========== MÉTODOS DE PAGAMENTO ===========

  @Post('payment-methods')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar um novo método de pagamento' })
  createPaymentMethod(@Body() createMethodDto: CreatePaymentMethodDto) {
    return this.financeService.createPaymentMethod(createMethodDto);
  }

  @Get('payment-methods')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar todos os métodos de pagamento' })
  @ApiQuery({ name: 'onlyActive', required: false, description: 'Filtrar apenas ativos', type: 'boolean' })
  findAllPaymentMethods(@Query('onlyActive') onlyActive?: string) {
    return this.financeService.findAllPaymentMethods(onlyActive === 'true');
  }

  @Get('payment-methods/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obter um método de pagamento específico' })
  @ApiParam({ name: 'id', description: 'ID do método de pagamento' })
  findPaymentMethodById(@Param('id') id: string) {
    return this.financeService.findPaymentMethodById(id);
  }

  @Patch('payment-methods/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar um método de pagamento' })
  @ApiParam({ name: 'id', description: 'ID do método de pagamento' })
  updatePaymentMethod(
    @Param('id') id: string,
    @Body() updateMethodDto: UpdatePaymentMethodDto,
  ) {
    return this.financeService.updatePaymentMethod(id, updateMethodDto);
  }

  @Delete('payment-methods/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover um método de pagamento' })
  @ApiParam({ name: 'id', description: 'ID do método de pagamento' })
  removePaymentMethod(@Param('id') id: string) {
    return this.financeService.removePaymentMethod(id);
  }

  // =========== RELATÓRIOS FINANCEIROS ===========

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obter resumo financeiro' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (YYYY-MM-DD)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por filial' })
  getFinancialSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.financeService.getFinancialSummary(startDate, endDate, branchId);
  }
} 