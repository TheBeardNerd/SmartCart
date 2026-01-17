import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderStateMachineService } from './order-state-machine.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationIntegrationService } from '../notifications/notification-integration.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderStateMachineService, PrismaService, NotificationIntegrationService],
  exports: [OrdersService],
})
export class OrdersModule {}
