import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface PriceCheckResult {
  productId: string;
  store: string;
  oldPrice: number;
  newPrice: number;
  priceDropPercent: number;
}

export class PriceMonitorService {
  private catalogServiceUrl: string;
  private notificationServiceUrl: string;

  constructor() {
    this.catalogServiceUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
  }

  /**
   * Check all active price trackings for price drops
   */
  async checkAllPrices(): Promise<void> {
    try {
      console.log('[PriceMonitor] Starting price check...');

      // Get all active trackings that haven't been checked in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const trackings = await prisma.priceTracking.findMany({
        where: {
          isActive: true,
          lastChecked: {
            lt: oneHourAgo,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
        },
      });

      console.log(`[PriceMonitor] Found ${trackings.length} trackings to check`);

      // Check prices for each tracking
      const priceChecks = trackings.map((tracking) => this.checkPriceForTracking(tracking));
      const results = await Promise.allSettled(priceChecks);

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(
        `[PriceMonitor] Price check complete. Success: ${successful}, Failed: ${failed}`
      );
    } catch (error) {
      console.error('[PriceMonitor] Error during price check:', error);
    }
  }

  /**
   * Check price for a single tracking
   */
  private async checkPriceForTracking(tracking: any): Promise<void> {
    try {
      // Fetch current price from catalog service
      const currentPrice = await this.fetchProductPrice(tracking.productId, tracking.store);

      // Update last checked timestamp
      await prisma.priceTracking.update({
        where: { id: tracking.id },
        data: { lastChecked: new Date() },
      });

      if (!currentPrice) {
        console.log(
          `[PriceMonitor] No price found for ${tracking.productId} at ${tracking.store}`
        );
        return;
      }

      // Check if price has dropped
      const oldPrice = parseFloat(tracking.currentPrice.toString());
      const priceDropAmount = oldPrice - currentPrice;
      const priceDropPercent = (priceDropAmount / oldPrice) * 100;

      // Check if price dropped significantly
      const shouldNotify =
        priceDropPercent >= parseFloat(tracking.priceDropPercent?.toString() || '10') ||
        (tracking.targetPrice &&
          currentPrice <= parseFloat(tracking.targetPrice.toString()));

      if (shouldNotify && !tracking.notified) {
        console.log(
          `[PriceMonitor] Price drop detected for ${tracking.productName}: $${oldPrice} → $${currentPrice} (${priceDropPercent.toFixed(1)}% off)`
        );

        // Update tracking with new price and mark as notified
        await prisma.priceTracking.update({
          where: { id: tracking.id },
          data: {
            currentPrice: new Prisma.Decimal(currentPrice),
            notified: true,
          },
        });

        // Send notification
        await this.sendPriceDropNotification(tracking, oldPrice, currentPrice, priceDropPercent);
      } else if (currentPrice !== oldPrice) {
        // Price changed but didn't meet notification criteria
        await prisma.priceTracking.update({
          where: { id: tracking.id },
          data: {
            currentPrice: new Prisma.Decimal(currentPrice),
          },
        });

        console.log(
          `[PriceMonitor] Price updated for ${tracking.productName}: $${oldPrice} → $${currentPrice} (not significant enough to notify)`
        );
      }
    } catch (error) {
      console.error(`[PriceMonitor] Error checking price for tracking ${tracking.id}:`, error);
    }
  }

  /**
   * Fetch current price for a product from catalog service
   */
  private async fetchProductPrice(productId: string, store: string): Promise<number | null> {
    try {
      const response = await axios.get(
        `${this.catalogServiceUrl}/api/products/${productId}`,
        {
          params: { store },
          timeout: 10000,
        }
      );

      if (response.data?.success && response.data?.data?.product) {
        return response.data.data.product.price;
      }

      return null;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error('[PriceMonitor] Catalog service is not available');
      } else {
        console.error('[PriceMonitor] Error fetching product price:', error.message);
      }
      return null;
    }
  }

  /**
   * Send price drop notification to user
   */
  private async sendPriceDropNotification(
    tracking: any,
    oldPrice: number,
    newPrice: number,
    priceDropPercent: number
  ): Promise<void> {
    try {
      await axios.post(
        `${this.notificationServiceUrl}/api/notifications/send`,
        {
          userId: tracking.userId,
          type: 'price_drop',
          title: `Price Drop Alert: ${tracking.productName}`,
          message: `Price dropped from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)} (${priceDropPercent.toFixed(1)}% off) at ${tracking.store}!`,
          data: {
            trackingId: tracking.id,
            productId: tracking.productId,
            productName: tracking.productName,
            store: tracking.store,
            oldPrice,
            newPrice,
            priceDropPercent,
            imageUrl: tracking.imageUrl,
          },
        },
        {
          timeout: 5000,
        }
      );

      console.log(
        `[PriceMonitor] Notification sent to user ${tracking.user.email} for ${tracking.productName}`
      );
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error('[PriceMonitor] Notification service is not available');
      } else {
        console.error('[PriceMonitor] Error sending notification:', error.message);
      }
    }
  }

  /**
   * Reset notification flag when price goes back up
   * This allows users to be notified again if price drops in the future
   */
  async resetNotificationFlags(): Promise<void> {
    try {
      const trackings = await prisma.priceTracking.findMany({
        where: {
          isActive: true,
          notified: true,
        },
      });

      for (const tracking of trackings) {
        const currentPrice = await this.fetchProductPrice(tracking.productId, tracking.store);

        if (currentPrice) {
          const trackedPrice = parseFloat(tracking.currentPrice.toString());
          const initialPrice = parseFloat(tracking.initialPrice.toString());

          // If price went back close to initial price, reset notification flag
          if (currentPrice >= initialPrice * 0.95) {
            await prisma.priceTracking.update({
              where: { id: tracking.id },
              data: {
                notified: false,
                currentPrice: new Prisma.Decimal(currentPrice),
              },
            });

            console.log(
              `[PriceMonitor] Reset notification flag for ${tracking.productName} (price recovered)`
            );
          }
        }
      }
    } catch (error) {
      console.error('[PriceMonitor] Error resetting notification flags:', error);
    }
  }
}

// Export singleton instance
export const priceMonitorService = new PriceMonitorService();
