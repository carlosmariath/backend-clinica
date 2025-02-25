import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard) // Protegendo com autenticação JWT
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('clients')
  async listClients() {
    return this.usersService.findAllClients();
  }
}