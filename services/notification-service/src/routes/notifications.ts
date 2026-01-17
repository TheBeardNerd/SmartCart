import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification-service';
import { logger } from '../utils/logger';

export function createNotificationRoutes(notificationService: NotificationService): Router {
  const router = Router();

  /**
   * POST /api/notifications/price-update
   * Trigger price update notification
   */
  router.post('/price-update', async (req: Request, res: Response) => {
    try {
      const { productId, oldPrice, newPrice, store, inStock } = req.body;

      if (!productId || oldPrice == null || newPrice == null || !store) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: productId, oldPrice, newPrice, store',
        });
      }

      await notificationService.sendPriceUpdate(productId, {
        oldPrice,
        newPrice,
        store,
        inStock: inStock !== false,
      });

      res.json({
        success: true,
        message: 'Price update notification sent',
      });
    } catch (error) {
      logger.error('Price update notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send price update notification',
      });
    }
  });

  /**
   * POST /api/notifications/cart-update
   * Trigger cart update notification
   */
  router.post('/cart-update', async (req: Request, res: Response) => {
    try {
      const { userId, cartData } = req.body;

      if (!userId || !cartData) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, cartData',
        });
      }

      await notificationService.sendCartUpdate(userId, cartData);

      res.json({
        success: true,
        message: 'Cart update notification sent',
      });
    } catch (error) {
      logger.error('Cart update notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send cart update notification',
      });
    }
  });

  /**
   * POST /api/notifications/order-update
   * Trigger order status update notification
   */
  router.post('/order-update', async (req: Request, res: Response) => {
    try {
      const { userId, orderNumber, status, total, estimatedDelivery } = req.body;

      if (!userId || !orderNumber || !status) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, orderNumber, status',
        });
      }

      await notificationService.sendOrderUpdate(userId, {
        orderNumber,
        status,
        total,
        estimatedDelivery,
      });

      res.json({
        success: true,
        message: 'Order update notification sent',
      });
    } catch (error) {
      logger.error('Order update notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send order update notification',
      });
    }
  });

  /**
   * POST /api/notifications/order-confirmation
   * Send order confirmation
   */
  router.post('/order-confirmation', async (req: Request, res: Response) => {
    try {
      const { userId, email, orderNumber, total, items, estimatedDelivery } = req.body;

      if (!userId || !email || !orderNumber || total == null || !items || !estimatedDelivery) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
      }

      await notificationService.sendOrderConfirmation(userId, email, {
        orderNumber,
        total,
        items,
        estimatedDelivery,
      });

      res.json({
        success: true,
        message: 'Order confirmation sent',
      });
    } catch (error) {
      logger.error('Order confirmation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send order confirmation',
      });
    }
  });

  /**
   * POST /api/notifications/welcome
   * Send welcome notification to new user
   */
  router.post('/welcome', async (req: Request, res: Response) => {
    try {
      const { userId, email, firstName } = req.body;

      if (!userId || !email || !firstName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, email, firstName',
        });
      }

      await notificationService.sendWelcomeNotification(userId, email, firstName);

      res.json({
        success: true,
        message: 'Welcome notification sent',
      });
    } catch (error) {
      logger.error('Welcome notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send welcome notification',
      });
    }
  });

  /**
   * POST /api/notifications/price-drop-alert
   * Send price drop alert
   */
  router.post('/price-drop-alert', async (req: Request, res: Response) => {
    try {
      const { userId, email, productName, oldPrice, newPrice, savings, store } = req.body;

      if (!userId || !email || !productName || oldPrice == null || newPrice == null || savings == null || !store) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
      }

      await notificationService.sendPriceDropAlert(userId, email, {
        name: productName,
        oldPrice,
        newPrice,
        savings,
        store,
      });

      res.json({
        success: true,
        message: 'Price drop alert sent',
      });
    } catch (error) {
      logger.error('Price drop alert error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send price drop alert',
      });
    }
  });

  /**
   * POST /api/notifications/broadcast
   * Broadcast announcement to all users
   */
  router.post('/broadcast', async (req: Request, res: Response) => {
    try {
      const { title, message, type } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, message',
        });
      }

      await notificationService.broadcastAnnouncement({
        title,
        message,
        type: type || 'info',
      });

      res.json({
        success: true,
        message: 'Announcement broadcasted',
      });
    } catch (error) {
      logger.error('Broadcast error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to broadcast announcement',
      });
    }
  });

  /**
   * GET /api/notifications/stats
   * Get notification service statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await notificationService.getConnectionStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
      });
    }
  });

  return router;
}
