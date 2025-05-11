import { Module } from '@nestjs/common';
import { TherapistsService } from './therapists.service';
import { TherapistsController } from './therapists.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TherapistsController],
  providers: [TherapistsService, PrismaService],
  exports: [TherapistsService],
})
export class TherapistsModule {}
