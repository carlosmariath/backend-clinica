import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ServiceService } from './service.service';

@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  async findAll() {
    return await this.serviceService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.serviceService.findById(id);
  }

  @Post()
  async create(
    @Body() data: { name: string; description?: string; price: number },
  ) {
    return await this.serviceService.create(data);
  }
}
