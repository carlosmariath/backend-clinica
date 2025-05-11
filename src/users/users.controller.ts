import { Controller, Get, Post, Body, UseGuards, Patch, Param, Delete } from '@nestjs/common';
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
    return this.usersService.findAllClients();
  }

  // 🔹 Endpoint para listar apenas usuários administrativos (ADMIN e RECEPTIONIST)
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async listAdminUsers() {
    return this.usersService.findAdminUsers();
  }

  // 🔹 Endpoint para criar usuários administrativos (apenas ADMIN)
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
      body.branchId
    );
  }

  // 🔹 Endpoint para atualizar usuários administrativos (apenas ADMIN)
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

  // 🔹 Endpoint para excluir usuários (apenas ADMIN)
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
