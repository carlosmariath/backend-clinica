import { Injectable, OnModuleInit } from "@nestjs/common";
import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import slugify from "slugify"; // 🔹 Biblioteca para criar IDs ASCII válidos
import { PrismaService } from "../prisma/prisma.service";
import { FrequentQuestion } from "@prisma/client";

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private openai: OpenAI;
  private pinecone: Pinecone;
  private index: any;
  private similarityThreshold: number = 0.85;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
  }

  async onModuleInit() {
    try {
      this.index = this.pinecone.index(process.env.PINECONE_INDEX || '');
      console.log("✅ Conectado ao Pinecone com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao conectar ao Pinecone:", error.message);
    }
  }

  async addEntry(dto: {
    question: string;
    answer: string;
    categoryId?: string;
    tags?: string[];
    createdBy?: string;
  }) {
    try {
      const embedding = await this.generateEmbedding(dto.question);
      const vectorId = slugify(dto.question, { lower: true, strict: true });

      // Preparar metadados, filtrando valores nulos
      const metadata: Record<string, any> = { answer: dto.answer };
      if (dto.categoryId) metadata.categoryId = dto.categoryId;
      if (dto.tags && dto.tags.length > 0) metadata.tags = dto.tags;

      // Salva no Pinecone
      await this.index.upsert([
        {
          id: vectorId,
          values: embedding,
          metadata: metadata,
        },
      ]);

      // Salva no banco de dados relacional
      const knowledgeEntry = await this.prisma.knowledgeBase.create({
        data: {
          question: dto.question,
          answer: dto.answer,
          categoryId: dto.categoryId,
          tags: dto.tags || [],
          createdBy: dto.createdBy,
        },
      });

      console.log(`✅ Entrada adicionada com ID: ${knowledgeEntry.id}`);
      return knowledgeEntry;
    } catch (error) {
      console.error("❌ Erro ao adicionar entrada:", error.message);
      throw error;
    }
  }

  async searchKnowledge(userQuery: string) {
    try {
      const queryEmbedding = await this.generateEmbedding(userQuery);
      const result = await this.index.query({ 
        vector: queryEmbedding, 
        topK: 1,
        includeMetadata: true,
        includeValues: false,
      });

      if (result.matches.length > 0 && result.matches[0].score > this.similarityThreshold) {
        // Registrar a consulta como pergunta frequente
        const metadata = result.matches[0].metadata || {};
        const categoryId = metadata.categoryId || null;
        
        await this.recordFrequentQuestion(userQuery, categoryId);
        
        // Incrementar contador de visualizações se houver um categoryId válido
        if (categoryId) {
          await this.incrementViewCount(categoryId);
        }
        
        return metadata.answer || null;
      }
      
      // Se não encontrou uma resposta adequada, armazena como pergunta sem resposta
      await this.recordFrequentQuestion(userQuery);
      return null;
    } catch (error) {
      console.error("❌ Erro ao buscar resposta:", error.message);
      return null;
    }
  }

  async updateEntry(dto: {
    id: string,
    question?: string,
    answer?: string,
    categoryId?: string,
    tags?: string[],
    enabled?: boolean
  }) {
    try {
      // Busca a entrada atual
      const existingEntry = await this.prisma.knowledgeBase.findUnique({
        where: { id: dto.id }
      });

      if (!existingEntry) {
        throw new Error("Entrada não encontrada");
      }

      // Atualiza no banco de dados relacional
      const updatedEntry = await this.prisma.knowledgeBase.update({
        where: { id: dto.id },
        data: {
          question: dto.question || existingEntry.question,
          answer: dto.answer || existingEntry.answer,
          categoryId: dto.categoryId,
          tags: dto.tags || existingEntry.tags,
          enabled: dto.enabled !== undefined ? dto.enabled : existingEntry.enabled,
          updatedAt: new Date(),
        },
      });

      // Se a pergunta mudou, precisa gerar novo embedding
      if (dto.question || dto.answer) {
        const newQuestion = dto.question || existingEntry.question;
        const newAnswer = dto.answer || existingEntry.answer;
        
        // Remove o antigo do Pinecone
        const oldVectorId = slugify(existingEntry.question, { lower: true, strict: true });
        await this.index.deleteOne(oldVectorId);
        
        // Adiciona o novo ao Pinecone
        const newEmbedding = await this.generateEmbedding(newQuestion);
        const newVectorId = slugify(newQuestion, { lower: true, strict: true });
        
        // Preparar metadados, filtrando valores nulos
        const metadata: Record<string, any> = { answer: newAnswer };
        if (updatedEntry.categoryId) metadata.categoryId = updatedEntry.categoryId;
        if (updatedEntry.tags && updatedEntry.tags.length > 0) metadata.tags = updatedEntry.tags;
        
        await this.index.upsert([
          {
            id: newVectorId,
            values: newEmbedding,
            metadata: metadata,
          },
        ]);
      }

      console.log(`✅ Entrada atualizada: ${updatedEntry.id}`);
      return updatedEntry;
    } catch (error) {
      console.error("❌ Erro ao atualizar entrada:", error.message);
      throw error;
    }
  }

  async deleteEntry(id: string) {
    try {
      // Busca a entrada para obter a pergunta
      const entry = await this.prisma.knowledgeBase.findUnique({
        where: { id }
      });

      if (!entry) {
        throw new Error("Entrada não encontrada");
      }

      // Remove do Pinecone
      const vectorId = slugify(entry.question, { lower: true, strict: true });
      await this.index.deleteOne(vectorId);

      // Remove do banco de dados relacional
      await this.prisma.knowledgeBase.delete({
        where: { id }
      });

      console.log(`✅ Entrada removida: ${id}`);
      return { success: true, id };
    } catch (error) {
      console.error("❌ Erro ao deletar entrada:", error.message);
      throw error;
    }
  }

  async getAllEntries(options?: {
    categoryId?: string,
    onlyEnabled?: boolean,
    skip?: number,
    take?: number,
    orderBy?: string,
    orderDirection?: 'asc' | 'desc'
  }) {
    const { categoryId, onlyEnabled = false, skip = 0, take = 50 } = options || {};
    
    try {
      const entries = await this.prisma.knowledgeBase.findMany({
        where: {
          ...(categoryId ? { categoryId: categoryId } : {}),
          ...(onlyEnabled ? { enabled: true } : {}),
        },
        //include: {
          //category: true,
        //},
        skip,
        take, 
        orderBy: options?.orderBy
          ? { [options.orderBy]: options?.orderDirection || 'desc' }
          : { createdAt: 'desc' },
      });
      return entries;
    } catch (error) {
      console.error("❌ Erro ao buscar entradas:", error.message);
      throw error;
    }
  }

  async getCategories() {
    try {
      return this.prisma.knowledgeCategory.findMany({
        include: {
          _count: {
            select: { knowledgeEntries: true }
          }
        },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error("❌ Erro ao buscar categorias:", error.message);
      throw error;
    }
  }

  async createCategory(data: { name: string, description?: string }) {
    try {
      return this.prisma.knowledgeCategory.create({
        data
      });
    } catch (error) {
      console.error("❌ Erro ao criar categoria:", error.message);
      throw error;
    }
  }

  async updateCategory(id: string, data: { name?: string, description?: string }) {
    try {
      return this.prisma.knowledgeCategory.update({
        where: { id },
        data
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar categoria:", error.message);
      throw error;
    }
  }

  async deleteCategory(id: string) {
    try {
      return this.prisma.knowledgeCategory.delete({
        where: { id }
      });
    } catch (error) {
      console.error("❌ Erro ao deletar categoria:", error.message);
      throw error;
    }
  }

  async getFrequentQuestions(options?: {
    withoutAnswer?: boolean,
    minCount?: number,
    limit?: number
  }) {
    const { withoutAnswer = false, minCount = 2, limit = 100 } = options || {};
    
    try {
      return this.prisma.frequentQuestion.findMany({
        where: {
          ...(withoutAnswer ? { knowledgeId: null } : {}),
          count: { gte: minCount }
        },
        orderBy: { count: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error("❌ Erro ao buscar perguntas frequentes:", error.message);
      throw error;
    }
  }

  async convertFrequentQuestionToKnowledge(id: string, answer: string, categoryId?: string) {
    try {
      const frequentQuestion = await this.prisma.frequentQuestion.findUnique({
        where: { id }
      });

      if (!frequentQuestion) {
        throw new Error("Pergunta frequente não encontrada");
      }

      // Criar nova entrada na base de conhecimento
      const newEntry = await this.addEntry({
        question: frequentQuestion.question,
        answer,
        categoryId,
      });

      // Atualizar a pergunta frequente para vincular ao conhecimento
      await this.prisma.frequentQuestion.update({
        where: { id },
        data: {
          knowledgeId: newEntry.id,
          autoDetected: false
        }
      });

      return newEntry;
    } catch (error) {
      console.error("❌ Erro ao converter pergunta frequente:", error.message);
      throw error;
    }
  }

  private async recordFrequentQuestion(question: string, knowledgeId?: string) {
    try {
      // Verificar se é similar a alguma pergunta existente
      const similarQuestion = await this.findSimilarQuestion(question);
      
      if (similarQuestion) {
        // Incrementar contador da pergunta similar
        await this.prisma.frequentQuestion.update({
          where: { id: similarQuestion.id },
          data: {
            count: { increment: 1 },
            lastAskedAt: new Date(),
            knowledgeId: knowledgeId || similarQuestion.knowledgeId
          }
        });
      } else {
        // Criar nova pergunta frequente
        await this.prisma.frequentQuestion.create({
          data: {
            question,
            knowledgeId,
            lastAskedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error("❌ Erro ao registrar pergunta frequente:", error.message);
    }
  }

  private async findSimilarQuestion(query: string): Promise<FrequentQuestion | null> {
    try {
      // Buscar todas as perguntas frequentes
      const frequentQuestions = await this.prisma.frequentQuestion.findMany({
        take: 50,
        orderBy: { count: 'desc' }
      });
      
      if (frequentQuestions.length === 0) return null;
      
      // Gerar embeddings para a query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Batch dos embeddings das perguntas
      // Criar uma lista de promessas para gerar embeddings
      const embeddings = await Promise.all(
        frequentQuestions.map(q => this.generateEmbedding(q.question))
      );
      
      // Calcular similaridades e encontrar a mais próxima
      let bestMatch: FrequentQuestion | null = null;
      let highestSimilarity = 0;
      
      for (let i = 0; i < embeddings.length; i++) {
        const similarity = this.calculateCosineSimilarity(queryEmbedding, embeddings[i]);
        if (similarity > highestSimilarity && similarity > this.similarityThreshold) {
          highestSimilarity = similarity;
          bestMatch = frequentQuestions[i];
        }
      }
      
      return bestMatch;
    } catch (error) {
      console.error("❌ Erro ao buscar pergunta similar:", error.message);
      return null;
    }
  }

  private async incrementViewCount(id: string) {
    try {
      await this.prisma.knowledgeBase.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });
    } catch (error) {
      console.error("❌ Erro ao incrementar contador de visualizações:", error.message);
    }
  }

  private async generateEmbedding(text: string) {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding;
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vetores com dimensões diferentes");
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }
}