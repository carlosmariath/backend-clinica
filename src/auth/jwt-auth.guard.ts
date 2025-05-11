import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface AuthRequest extends Request {
  user?: any; // 🔹 Adiciona a propriedade `user` ao tipo Request
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>(); // 🔹 Usa o tipo personalizado
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token não encontrado');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload; // 🔹 Agora o TypeScript reconhece `request.user`
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
