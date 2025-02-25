import { Injectable, OnModuleInit } from "@nestjs/common";
import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import slugify from "slugify"; // 🔹 Biblioteca para criar IDs ASCII válidos

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private openai: OpenAI;
  private pinecone: Pinecone;
  private index: any;

  constructor() {
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

  async addEntry(question: string, answer: string) {
    try {
      const embedding = await this.generateEmbedding(question);

      // 🔹 Criando um ID ASCII válido
      const vectorId = slugify(question, { lower: true, strict: true });

      await this.index.upsert([
        {
          id: vectorId, // ✅ Agora o ID está em ASCII válido!
          values: embedding,
          metadata: { answer },
        },
      ]);
      console.log(`✅ Entrada adicionada ao Pinecone com ID: ${vectorId}`);
    } catch (error) {
      console.error("❌ Erro ao adicionar entrada ao Pinecone:", error.message);
    }
  }

  async searchKnowledge(userQuery: string) {
    try {
      const queryEmbedding = await this.generateEmbedding(userQuery);
      const result = await this.index.query({ vector: queryEmbedding, topK: 1 });

      if (result.matches.length > 0) {
        return result.matches[0].metadata?.answer || null;
      }
      return null;
    } catch (error) {
      console.error("❌ Erro ao buscar resposta no Pinecone:", error.message);
      return null;
    }
  }

  async updateEntry(question: string, newAnswer: string) {
    try {
      await this.addEntry(question, newAnswer);
      console.log("✅ Entrada atualizada no Pinecone!");
    } catch (error) {
      console.error("❌ Erro ao atualizar entrada no Pinecone:", error.message);
    }
  }

  async deleteEntry(question: string) {
    try {
      const vectorId = slugify(question, { lower: true, strict: true });

      await this.index.delete({ ids: [vectorId] });
      console.log(`✅ Entrada removida do Pinecone com ID: ${vectorId}`);
    } catch (error) {
      console.error("❌ Erro ao deletar entrada no Pinecone:", error.message);
    }
  }

  private async generateEmbedding(text: string) {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding;
  }
}