import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  // Endpoints para usuários autenticados (administradores)

  @Get()
  @UseGuards(JwtAuthGuard)
  //@Roles('ADMIN')
  async getAllEntries(
    @Query('categoryId') categoryId?: string,
    @Query('onlyEnabled') onlyEnabled?: boolean,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('orderBy') orderBy?: string,
    @Query('orderDirection') orderDirection?: 'asc' | 'desc',
  ) {
    return this.knowledgeService.getAllEntries({
      categoryId,
      onlyEnabled,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      orderBy,
      orderDirection,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async addEntry(
    @Body()
    body: {
      question: string;
      answer: string;
      categoryId?: string;
      tags?: string[];
      createdBy?: string;
    },
  ) {
    return this.knowledgeService.addEntry(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateEntry(
    @Param('id') id: string,
    @Body()
    body: {
      question?: string;
      answer?: string;
      categoryId?: string;
      tags?: string[];
      enabled?: boolean;
    },
  ) {
    return this.knowledgeService.updateEntry({
      id,
      ...body,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteEntry(@Param('id') id: string) {
    return this.knowledgeService.deleteEntry(id);
  }

  // Endpoints para categorias

  @Get('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  //@Roles('ADMIN')
  async getCategories() {
    return this.knowledgeService.getCategories();
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createCategory(@Body() body: { name: string; description?: string }) {
    return this.knowledgeService.createCategory(body);
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.knowledgeService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteCategory(@Param('id') id: string) {
    return this.knowledgeService.deleteCategory(id);
  }

  // Endpoints para análise de perguntas frequentes

  @Get('frequent-questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getFrequentQuestions(
    @Query('withoutAnswer') withoutAnswer?: string,
    @Query('minCount') minCount?: number,
    @Query('limit') limit?: number,
  ) {
    return this.knowledgeService.getFrequentQuestions({
      withoutAnswer: withoutAnswer === 'true',
      minCount: minCount ? Number(minCount) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('frequent-questions/:id/convert')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async convertFrequentQuestion(
    @Param('id') id: string,
    @Body() body: { answer: string; categoryId?: string },
  ) {
    return this.knowledgeService.convertFrequentQuestionToKnowledge(
      id,
      body.answer,
      body.categoryId,
    );
  }

  // Endpoint para busca pública (usado pelo serviço de WhatsApp)
  @Post('search')
  async searchKnowledge(@Body() body: { question: string }) {
    return this.knowledgeService.searchKnowledge(body.question);
  }
}
