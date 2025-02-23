import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private usersService: UsersService) {}

  @Post('register')
  async register(@Body() body: { name: string; email: string; password: string; role: Role, phone: string }) {
    
    return this.usersService.createUser(body.name, body.email, body.password, body.role, body.phone);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }
   // 🔹 Protegendo a rota com o JwtAuthGuard
   @UseGuards(JwtAuthGuard)
   @Get('me')
   async getProfile(@Req() req) {
     return req.user; // Retorna os dados do usuário autenticado
   }
}