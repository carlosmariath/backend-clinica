import { Controller, Get, Post, Put, Delete, Body, Param } from "@nestjs/common";
import { KnowledgeService } from "./knowledge.service";

@Controller("knowledge")
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  // @Get()c
  // async getAllEntries() {
  //   return this.knowledgeService.getAllEntries();
  // }

  @Post()
  async addEntry(@Body() body: { question: string; answer: string }) {
    return this.knowledgeService.addEntry(body.question, body.answer);
  }

  @Put(":id")
  async updateEntry(@Param("id") id: string, @Body() body: { answer: string }) {
    return this.knowledgeService.updateEntry(id, body.answer);
  }

  @Delete(":id")
  async deleteEntry(@Param("id") id: string) {
    return this.knowledgeService.deleteEntry(id);
  }

  @Post("search")
  async searchKnowledge(@Body() body: { question: string }) {
    return this.knowledgeService.searchKnowledge(body.question);
  }
}