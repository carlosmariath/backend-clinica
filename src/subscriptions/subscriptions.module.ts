import { Module } from '@nestjs/common';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionsService } from './services/subscriptions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
