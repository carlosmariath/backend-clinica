import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
  Put,
  NotFoundException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard) // Protegendo com autenticação JWT
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('clients')
  async listClients() {
    // Manter comportamento antigo para compatibilidade
    const result = await this.usersService.findAllClients();
    return result.data || result; // Retorna só os dados para compatibilidade
  }

  @Get('clients/paginated')
  async listClientsPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    return this.usersService.findAllClients(pageNum, limitNum);
  }

  @Get('clients/:id')
  async getClientById(@Param('id') id: string) {
    const client = await this.usersService.findById(id);

    if (!client || client.role !== 'CLIENT') {
      throw new NotFoundException('Cliente não encontrado');
    }

    return client;
  }

  @Post('clients')
  async createClient(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string;
    },
  ) {
    return this.usersService.createClient(body.name, body.email, body.phone);
  }

  @Put('clients/:id')
  async updateClient(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
    },
  ) {
    const existingClient = await this.usersService.findById(id);

    if (!existingClient) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (existingClient.role !== 'CLIENT') {
      throw new BadRequestException('O usuário não é um cliente');
    }

    return this.usersService.updateUser(id, {
      ...body,
      role: 'CLIENT',
    });
  }

  @Delete('clients/:id')
  async deleteClient(@Param('id') id: string) {
    const existingClient = await this.usersService.findById(id);

    if (!existingClient) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (existingClient.role !== 'CLIENT') {
      throw new BadRequestException('O usuário não é um cliente');
    }

    return this.usersService.deleteUser(id);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async listAdminUsers() {
    return this.usersService.findAdminUsers();
  }

  @Post('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createAdminUser(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      role: Role;
      phone: string;
      branchId?: string;
    },
  ) {
    return this.usersService.createUser(
      body.name,
      body.email,
      body.password,
      body.role,
      body.phone,
      body.branchId,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
      role?: Role;
      phone?: string;
      branchId?: string;
    },
  ) {
    return this.usersService.updateUser(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
