import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Order } from '@prisma/client';

@Injectable()
export class NotificationIntegrationService {
  private readonly logger = new Logger(NotificationIntegrationService.name);
  private readonly notificationServiceUrl: string;

  constructor() {
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
  }

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(order: Order & { items: any[] }): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/order-confirmation`, {
        userId: order.userId,
        email: order.contactEmail,
        orderNumber: order.orderNumber,
        total: parseFloat(order.total.toString()),
        items: order.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: parseFloat(item.unitPrice.toString()),
        })),
        estimatedDelivery: order.estimatedDelivery?.toISOString(),
      });

      this.logger.log(`Order confirmation sent for order ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send order confirmation: ${error.message}`);
      // Don't throw - notification failures shouldn't break order creation
    }
  }

  /**
   * Send order status update notification
   */
  async sendOrderStatusUpdate(order: Order, status: string): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/order-update`, {
        userId: order.userId,
        orderNumber: order.orderNumber,
        status,
        total: parseFloat(order.total.toString()),
        estimatedDelivery: order.estimatedDelivery?.toISOString(),
      });

      this.logger.log(`Order status update sent for order ${order.orderNumber}: ${status}`);
    } catch (error) {
      this.logger.error(`Failed to send order status update: ${error.message}`);
    }
  }

  /**
   * Send order cancellation notification
   */
  async sendOrderCancellation(order: Order, reason?: string): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/order-update`, {
        userId: order.userId,
        orderNumber: order.orderNumber,
        status: 'cancelled',
        total: parseFloat(order.total.toString()),
        estimatedDelivery: null,
      });

      this.logger.log(`Order cancellation sent for order ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send order cancellation: ${error.message}`);
    }
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(order: Order): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/order-update`, {
        userId: order.userId,
        orderNumber: order.orderNumber,
        status: 'delivered',
        total: parseFloat(order.total.toString()),
        estimatedDelivery: order.actualDelivery?.toISOString(),
      });

      this.logger.log(`Delivery notification sent for order ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send delivery notification: ${error.message}`);
    }
  }
}
