import { PrismaClient, StockStatus, ReservationStatus } from '@prisma/client';
import { config } from '../config';
import { redisClient } from '../utils/redis';

const prisma = new PrismaClient();

export class InventoryService {
  // Get or create inventory record
  async getOrCreateInventory(productId: string, store: string, productName: string) {
    let inventory = await prisma.inventory.findUnique({
      where: {
        productId_store: {
          productId,
          store,
        },
      },
    });

    if (!inventory) {
      // Create new inventory record with random initial stock (simulated)
      const initialStock = Math.floor(Math.random() * 50) + 10; // 10-60 items
      inventory = await prisma.inventory.create({
        data: {
          productId,
          productName,
          store,
          quantity: initialStock,
          status: this.calculateStockStatus(initialStock, config.stock.lowStockThreshold),
        },
      });
    }

    return inventory;
  }

  // Calculate stock status based on quantity
  private calculateStockStatus(quantity: number, lowStockThreshold: number): StockStatus {
    if (quantity === 0) return 'OUT_OF_STOCK';
    if (quantity <= lowStockThreshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  // Get available stock (considering active reservations)
  async getAvailableStock(productId: string, store: string): Promise<number> {
    const inventory = await prisma.inventory.findUnique({
      where: { productId_store: { productId, store } },
      include: {
        reservations: {
          where: {
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!inventory) return 0;

    const reservedQty = inventory.reservations.reduce((sum, res) => sum + res.quantity, 0);
    return Math.max(0, inventory.quantity - reservedQty);
  }

  // Check stock for multiple products
  async checkStockBatch(items: Array<{ productId: string; store: string; quantity: number }>) {
    const results = await Promise.all(
      items.map(async (item) => {
        const available = await this.getAvailableStock(item.productId, item.store);
        const inventory = await prisma.inventory.findUnique({
          where: { productId_store: { productId: item.productId, store: item.store } },
        });

        return {
          productId: item.productId,
          store: item.store,
          requested: item.quantity,
          available,
          status: inventory?.status || 'OUT_OF_STOCK',
          inStock: available >= item.quantity,
        };
      })
    );

    return results;
  }

  // Reserve stock for checkout
  async reserveStock(userId: string, items: Array<{ productId: string; store: string; quantity: number }>, orderId?: string) {
    const expiresAt = new Date(Date.now() + config.stock.reservationExpiryMinutes * 60 * 1000);
    const reservations = [];

    for (const item of items) {
      const available = await this.getAvailableStock(item.productId, item.store);

      if (available < item.quantity) {
        throw new Error(`Insufficient stock for ${item.productId} at ${item.store}`);
      }

      const inventory = await prisma.inventory.findUnique({
        where: { productId_store: { productId: item.productId, store: item.store } },
      });

      if (!inventory) {
        throw new Error(`Product ${item.productId} not found at ${item.store}`);
      }

      const reservation = await prisma.stockReservation.create({
        data: {
          inventoryId: inventory.id,
          userId,
          orderId,
          quantity: item.quantity,
          expiresAt,
        },
      });

      reservations.push(reservation);
    }

    return { reservations, expiresAt };
  }

  // Release reservation (cancel/expire)
  async releaseReservation(reservationId: string) {
    await prisma.stockReservation.update({
      where: { id: reservationId },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });
  }

  // Complete reservation (order placed)
  async completeReservation(reservationId: string) {
    const reservation = await prisma.stockReservation.findUnique({
      where: { id: reservationId },
      include: { inventory: true },
    });

    if (!reservation) throw new Error('Reservation not found');

    // Update reservation
    await prisma.stockReservation.update({
      where: { id: reservationId },
      data: { status: 'COMPLETED' },
    });

    // Decrease actual stock
    const newQuantity = Math.max(0, reservation.inventory.quantity - reservation.quantity);
    await this.updateStock(
      reservation.inventory.id,
      newQuantity,
      'SALE',
      `Order ${reservation.orderId}`,
      reservation.userId
    );
  }

  // Update stock levels
  async updateStock(inventoryId: string, newQuantity: number, action: string, reason?: string, userId?: string) {
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) throw new Error('Inventory not found');

    const previousQty = inventory.quantity;
    const newStatus = this.calculateStockStatus(newQuantity, inventory.lowStockThreshold);

    // Update inventory
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        quantity: newQuantity,
        status: newStatus,
        lastUpdated: new Date(),
      },
    });

    // Record history
    await prisma.stockHistory.create({
      data: {
        inventoryId,
        action,
        quantity: newQuantity - previousQty,
        previousQty,
        newQty: newQuantity,
        reason,
        userId,
      },
    });

    // If stock back in stock, notify subscribers
    if (previousQty === 0 && newQuantity > 0) {
      await this.notifyStockAvailable(inventoryId);
    }

    return { previousQty, newQty: newQuantity, status: newStatus };
  }

  // Subscribe to stock notification
  async subscribeToStockNotification(productId: string, store: string, userId: string, email: string) {
    const inventory = await prisma.inventory.findUnique({
      where: { productId_store: { productId, store } },
    });

    if (!inventory) throw new Error('Product not found');

    const existing = await prisma.stockNotification.findUnique({
      where: {
        inventoryId_userId: {
          inventoryId: inventory.id,
          userId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return await prisma.stockNotification.create({
      data: {
        inventoryId: inventory.id,
        userId,
        email,
      },
    });
  }

  // Notify when stock is available
  private async notifyStockAvailable(inventoryId: string) {
    const notifications = await prisma.stockNotification.findMany({
      where: {
        inventoryId,
        isActive: true,
        notifiedAt: null,
      },
      include: {
        inventory: true,
      },
    });

    for (const notification of notifications) {
      // Mark as notified
      await prisma.stockNotification.update({
        where: { id: notification.id },
        data: {
          notifiedAt: new Date(),
          isActive: false,
        },
      });

      // TODO: Send actual notification via notification service
      console.log(`Stock available notification for ${notification.email}: ${notification.inventory.productName}`);
    }
  }

  // Clean up expired reservations
  async cleanupExpiredReservations() {
    const expired = await prisma.stockReservation.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
    });

    for (const reservation of expired) {
      await this.releaseReservation(reservation.id);
    }

    return expired.length;
  }

  // Get low stock products
  async getLowStockProducts(store?: string) {
    const where: any = {
      OR: [
        { status: 'LOW_STOCK' },
        { status: 'OUT_OF_STOCK' },
      ],
    };

    if (store) {
      where.store = store;
    }

    return await prisma.inventory.findMany({
      where,
      orderBy: [
        { status: 'desc' },
        { quantity: 'asc' },
      ],
    });
  }

  // Simulate stock sync (in production, this would sync with actual store APIs)
  async syncStockFromStores() {
    const inventories = await prisma.inventory.findMany();

    for (const inventory of inventories) {
      // Simulate random stock changes
      const change = Math.floor(Math.random() * 20) - 10; // -10 to +10
      const newQuantity = Math.max(0, inventory.quantity + change);

      if (change !== 0) {
        await this.updateStock(
          inventory.id,
          newQuantity,
          change > 0 ? 'RESTOCK' : 'ADJUSTMENT',
          'Automated sync'
        );
      }
    }
  }
}

export const inventoryService = new InventoryService();
