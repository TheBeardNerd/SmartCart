import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationIntegrationService } from '../notifications/notification-integration.service';

@Module({
  controllers: [OrdersController, AnalyticsController],
  providers: [OrdersService, AnalyticsService, OrderStateMachineService, PrismaService, NotificationIntegrationService],
  exports: [OrdersService],
})
export class OrdersModule {}
