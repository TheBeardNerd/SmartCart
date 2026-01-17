import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, OrderStatus as OrderStatusDto } from './dto/update-order-status.dto';
import { OrderStateMachineService } from './order-state-machine.service';
import { NotificationIntegrationService } from '../notifications/notification-integration.service';
import { Order, OrderStatus as PrismaOrderStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private stateMachine: OrderStateMachineService,
    private notifications: NotificationIntegrationService,
  ) {}

  /**
   * Create a new order
   */
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Validate items
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Calculate pricing
    const pricing = this.calculateOrderPricing(createOrderDto);

    // Generate unique order number
    const orderNumber = this.generateOrderNumber();

    // Group items by store for store fulfillments
    const storeGroups = this.groupItemsByStore(createOrderDto.items);

    // Create order with items and store fulfillments
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: createOrderDto.userId,
        status: PrismaOrderStatus.PENDING,
        paymentStatus: 'PENDING',
        fulfillmentType: createOrderDto.fulfillmentType as any,

        // Pricing
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        deliveryFee: pricing.deliveryFee,
        serviceFee: pricing.serviceFee,
        discount: pricing.discount,
        total: pricing.total,

        // Delivery info
        deliveryAddress: createOrderDto.deliveryAddress || Prisma.JsonNull,
        deliveryWindow: createOrderDto.deliveryWindow || Prisma.JsonNull,
        estimatedDelivery: this.calculateEstimatedDelivery(),

        // Customer info
        customerNotes: createOrderDto.customerNotes,
        contactPhone: createOrderDto.contactPhone,
        contactEmail: createOrderDto.contactEmail,

        // Optimization
        optimizationStrategy: createOrderDto.optimizationStrategy,
        estimatedSavings: createOrderDto.estimatedSavings,

        // Payment
        paymentMethodId: createOrderDto.paymentMethodId,
        paymentIntentId: createOrderDto.paymentIntentId,

        // Create order items
        items: {
          create: createOrderDto.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            sku: item.sku,
            storeId: item.storeId,
            storeName: item.storeName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
            tax: this.calculateItemTax(item.quantity * item.unitPrice),
            total: item.quantity * item.unitPrice + this.calculateItemTax(item.quantity * item.unitPrice),
            attributes: item.attributes || Prisma.JsonNull,
          })),
        },

        // Create store fulfillments
        storeFulfillments: {
          create: Array.from(storeGroups.entries()).map(([storeId, storeData]) => {
            const storeSubtotal = storeData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
            const storeTax = this.calculateItemTax(storeSubtotal);

            return {
              storeId,
              storeName: storeData.storeName,
              status: PrismaOrderStatus.PENDING,
              subtotal: storeSubtotal,
              tax: storeTax,
              deliveryFee: storeGroups.size > 1 ? pricing.deliveryFee / storeGroups.size : pricing.deliveryFee,
              total: storeSubtotal + storeTax,
              estimatedDelivery: this.calculateEstimatedDelivery(),
              deliveryWindow: createOrderDto.deliveryWindow || Prisma.JsonNull,
            };
          }),
        },

        // Create initial status history
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: PrismaOrderStatus.PENDING,
            reason: 'Order created',
            changedBy: createOrderDto.userId,
          },
        },
      },
      include: {
        items: true,
        storeFulfillments: true,
        statusHistory: true,
      },
    });

    // Send order confirmation notification asynchronously
    this.notifications.sendOrderConfirmation(order).catch((err) => {
      console.error('Failed to send order confirmation notification:', err);
    });

    return order;
  }

  /**
   * Find all orders for a user
   */
  async findAllByUser(userId: string, limit: number = 50, offset: number = 0): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        storeFulfillments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Find one order by ID
   */
  async findOne(id: string, userId?: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        storeFulfillments: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // If userId is provided, verify ownership
    if (userId && order.userId !== userId) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string, userId?: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        storeFulfillments: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    // If userId is provided, verify ownership
    if (userId && order.userId !== userId) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    return order;
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto): Promise<Order> {
    // Find existing order
    const order = await this.findOne(id);

    // Map DTO status to Prisma enum
    const currentStatus = order.status as unknown as OrderStatusDto;
    const newStatus = updateStatusDto.status;

    // Validate transition
    this.stateMachine.validateTransition(currentStatus, newStatus);

    // Update order and create status history
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: newStatus as any,
        ...(newStatus === OrderStatusDto.CONFIRMED && { confirmedAt: new Date() }),
        ...(newStatus === OrderStatusDto.CANCELLED && { cancelledAt: new Date() }),
        ...(newStatus === OrderStatusDto.DELIVERED && { actualDelivery: new Date() }),
        statusHistory: {
          create: {
            fromStatus: currentStatus as any,
            toStatus: newStatus as any,
            reason: updateStatusDto.reason,
            notes: updateStatusDto.notes,
            changedBy: updateStatusDto.changedBy || 'system',
          },
        },
        // Update store fulfillments status as well
        ...(newStatus !== OrderStatusDto.CANCELLED && {
          storeFulfillments: {
            updateMany: {
              where: { orderId: id },
              data: { status: newStatus as any },
            },
          },
        }),
      },
      include: {
        items: true,
        storeFulfillments: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Send status update notification if applicable
    if (this.stateMachine.shouldNotifyCustomer(newStatus)) {
      if (newStatus === OrderStatusDto.DELIVERED) {
        this.notifications.sendDeliveryNotification(updatedOrder).catch((err) => {
          console.error('Failed to send delivery notification:', err);
        });
      } else if (newStatus === OrderStatusDto.CANCELLED) {
        this.notifications.sendOrderCancellation(updatedOrder, updateStatusDto.reason).catch((err) => {
          console.error('Failed to send cancellation notification:', err);
        });
      } else {
        this.notifications.sendOrderStatusUpdate(updatedOrder, newStatus).catch((err) => {
          console.error('Failed to send status update notification:', err);
        });
      }
    }

    return updatedOrder;
  }

  /**
   * Cancel an order
   */
  async cancel(id: string, userId: string, reason?: string): Promise<Order> {
    const order = await this.findOne(id, userId);

    const currentStatus = order.status as unknown as OrderStatusDto;

    if (!this.stateMachine.canCancel(currentStatus)) {
      throw new BadRequestException(`Cannot cancel order in ${currentStatus} status`);
    }

    return this.updateStatus(id, {
      status: OrderStatusDto.CANCELLED,
      reason: reason || 'Cancelled by customer',
      changedBy: userId,
    });
  }

  /**
   * Get order tracking information
   */
  async getTracking(id: string, userId?: string) {
    const order = await this.findOne(id, userId);

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      storeFulfillments: order.storeFulfillments.map((sf) => ({
        storeId: sf.storeId,
        storeName: sf.storeName,
        status: sf.status,
        trackingNumber: sf.trackingNumber,
        estimatedDelivery: sf.estimatedDelivery,
        actualDelivery: sf.actualDelivery,
      })),
      statusHistory: order.statusHistory,
    };
  }

  /**
   * Calculate order pricing
   */
  private calculateOrderPricing(orderDto: CreateOrderDto) {
    const subtotal = orderDto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const tax = this.calculateItemTax(subtotal);

    // Delivery fee logic
    const deliveryFee = orderDto.fulfillmentType === 'DELIVERY'
      ? (subtotal >= 35 ? 0 : 4.99)
      : 0;

    const serviceFee = 2.99;
    const discount = 0; // TODO: Apply promo codes

    const total = subtotal + tax + deliveryFee + serviceFee - discount;

    return {
      subtotal,
      tax,
      deliveryFee,
      serviceFee,
      discount,
      total,
    };
  }

  /**
   * Calculate tax for an amount
   */
  private calculateItemTax(amount: number): number {
    const TAX_RATE = parseFloat(process.env.DEFAULT_TAX_RATE || '0.08');
    return Math.round(amount * TAX_RATE * 100) / 100;
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}${random}`;
  }

  /**
   * Group order items by store
   */
  private groupItemsByStore(items: any[]) {
    const storeMap = new Map<string, { storeName: string; items: any[] }>();

    for (const item of items) {
      if (!storeMap.has(item.storeId)) {
        storeMap.set(item.storeId, {
          storeName: item.storeName,
          items: [],
        });
      }
      storeMap.get(item.storeId).items.push(item);
    }

    return storeMap;
  }

  /**
   * Calculate estimated delivery time
   */
  private calculateEstimatedDelivery(): Date {
    const now = new Date();
    // Add 2 hours for estimated delivery
    now.setHours(now.getHours() + 2);
    return now;
  }
}
