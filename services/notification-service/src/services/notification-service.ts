import { SocketServer } from '../websocket/socket-server';
import { queueNotification } from '../queues/notification-queue';
import { EmailService } from './email-service';
import { SMSService } from './sms-service';
import { logger } from '../utils/logger';

export class NotificationService {
  constructor(private socketServer: SocketServer) {}

  /**
   * Send price update notification
   */
  async sendPriceUpdate(productId: string, priceData: {
    oldPrice: number;
    newPrice: number;
    store: string;
    inStock: boolean;
  }): Promise<void> {
    const percentageChange = ((priceData.newPrice - priceData.oldPrice) / priceData.oldPrice) * 100;

    // Emit via WebSocket
    this.socketServer.emitPriceUpdate(productId, {
      oldPrice: priceData.oldPrice,
      newPrice: priceData.newPrice,
      store: priceData.store,
      percentageChange,
      inStock: priceData.inStock,
    });

    logger.info(`Price update sent for product ${productId}: ${percentageChange.toFixed(1)}% change`);
  }

  /**
   * Send cart update notification
   */
  async sendCartUpdate(userId: string, cartData: any): Promise<void> {
    // Emit via WebSocket
    this.socketServer.emitCartUpdate(userId, cartData);

    logger.info(`Cart update sent for user ${userId}`);
  }

  /**
   * Send order status update
   */
  async sendOrderUpdate(userId: string, orderData: {
    orderNumber: string;
    status: string;
    total?: number;
    estimatedDelivery?: string;
  }): Promise<void> {
    // Emit via WebSocket
    this.socketServer.emitOrderUpdate(userId, orderData);

    // Queue email notification
    await queueNotification({
      type: 'email',
      userId,
      data: {
        type: 'order_status',
        orderData,
      },
      priority: 'high',
    });

    logger.info(`Order update sent for user ${userId}: Order ${orderData.orderNumber} - ${orderData.status}`);
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(userId: string, email: string, orderData: {
    orderNumber: string;
    total: number;
    items: any[];
    estimatedDelivery: string;
  }): Promise<void> {
    // Send real-time notification
    this.socketServer.emitNotification(userId, {
      type: 'order_confirmed',
      title: 'Order Confirmed',
      message: `Your order #${orderData.orderNumber} has been confirmed!`,
      orderData,
    });

    // Queue email
    await queueNotification({
      type: 'email',
      userId,
      data: {
        to: email,
        template: 'order_confirmation',
        orderData,
      },
      priority: 'high',
    });

    logger.info(`Order confirmation sent for order ${orderData.orderNumber}`);
  }

  /**
   * Send welcome notification (new user)
   */
  async sendWelcomeNotification(userId: string, email: string, firstName: string): Promise<void> {
    // Send real-time notification
    this.socketServer.emitNotification(userId, {
      type: 'welcome',
      title: 'Welcome to SmartCart!',
      message: `Hi ${firstName}, start saving on your groceries today!`,
    });

    // Queue welcome email
    await queueNotification({
      type: 'email',
      userId,
      data: {
        to: email,
        template: 'welcome',
        firstName,
      },
      priority: 'medium',
    });

    logger.info(`Welcome notification sent for user ${email}`);
  }

  /**
   * Send price drop alert
   */
  async sendPriceDropAlert(userId: string, email: string, productData: {
    name: string;
    oldPrice: number;
    newPrice: number;
    savings: number;
    store: string;
  }): Promise<void> {
    // Send real-time notification
    this.socketServer.emitNotification(userId, {
      type: 'price_drop',
      title: 'Price Drop Alert!',
      message: `${productData.name} is now $${productData.newPrice.toFixed(2)} (save $${productData.savings.toFixed(2)})`,
      productData,
    });

    // Queue email
    await queueNotification({
      type: 'email',
      userId,
      data: {
        to: email,
        template: 'price_drop',
        productData,
      },
      priority: 'medium',
    });

    logger.info(`Price drop alert sent for ${productData.name}`);
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(userId: string, phone: string, orderNumber: string, estimatedTime: string): Promise<void> {
    // Send real-time notification
    this.socketServer.emitNotification(userId, {
      type: 'delivery',
      title: 'Delivery Update',
      message: `Your order #${orderNumber} will arrive around ${estimatedTime}`,
    });

    // Queue SMS
    if (phone) {
      await queueNotification({
        type: 'sms',
        userId,
        data: {
          to: phone,
          orderNumber,
          estimatedTime,
        },
        priority: 'high',
      });
    }

    logger.info(`Delivery notification sent for order ${orderNumber}`);
  }

  /**
   * Broadcast system announcement
   */
  async broadcastAnnouncement(announcement: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
  }): Promise<void> {
    this.socketServer.broadcast('announcement', announcement);

    logger.info(`System announcement broadcasted: ${announcement.title}`);
  }

  /**
   * Get connection stats
   */
  async getConnectionStats(): Promise<{
    totalConnections: number;
    timestamp: string;
  }> {
    const totalConnections = await this.socketServer.getConnectionCount();

    return {
      totalConnections,
      timestamp: new Date().toISOString(),
    };
  }
}
