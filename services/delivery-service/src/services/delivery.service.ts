import { PrismaClient, DeliveryStatus, DeliveryPreference, SlotType } from '@prisma/client';
import { config } from '../config';
import { redisClient } from '../utils/redis';

const prisma = new PrismaClient();

interface ScheduleDeliveryInput {
  orderId: string;
  userId: string;
  slotId?: string;
  preference: DeliveryPreference;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryInstructions?: string;
}

interface UpdateStatusInput {
  status: DeliveryStatus;
  message?: string;
  latitude?: number;
  longitude?: number;
}

class DeliveryService {
  // Generate delivery slots for the next N days
  async generateSlots(daysAhead: number = 14): Promise<void> {
    const now = new Date();
    const slots = [];

    for (let day = 0; day < daysAhead; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(0, 0, 0, 0);

      // Skip if slots already exist for this date
      const existingSlots = await prisma.deliverySlot.count({
        where: {
          date: {
            gte: date,
            lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existingSlots > 0) continue;

      // Generate slots for different time windows
      const slotDefinitions = [
        // Morning slots (8 AM - 12 PM)
        { start: '08:00', end: '10:00', type: SlotType.SCHEDULED, price: 0 },
        { start: '10:00', end: '12:00', type: SlotType.SCHEDULED, price: 0 },

        // Afternoon slots (12 PM - 5 PM)
        { start: '12:00', end: '14:00', type: SlotType.SCHEDULED, price: 0 },
        { start: '14:00', end: '17:00', type: SlotType.SCHEDULED, price: 0 },

        // Evening slots (5 PM - 9 PM)
        { start: '17:00', end: '19:00', type: SlotType.SCHEDULED, price: 2.99 },
        { start: '19:00', end: '21:00', type: SlotType.SCHEDULED, price: 4.99 },
      ];

      // Determine slot type based on day
      const isSameDay = day === 0 && now.getHours() < config.sameDayCutoffHour;
      const isNextDay = day === 1;

      for (const slotDef of slotDefinitions) {
        let slotType = slotDef.type;
        let price = slotDef.price;

        if (isSameDay && slotDef.start > `${String(now.getHours()).padStart(2, '0')}:00`) {
          slotType = SlotType.SAME_DAY;
          price = 9.99; // Premium for same-day
        } else if (isNextDay) {
          slotType = SlotType.NEXT_DAY;
          price = 4.99;
        }

        slots.push({
          date,
          startTime: slotDef.start,
          endTime: slotDef.end,
          slotType,
          capacity: config.defaultSlotsPerHour,
          booked: 0,
          price,
          available: true,
        });
      }
    }

    if (slots.length > 0) {
      await prisma.deliverySlot.createMany({
        data: slots,
        skipDuplicates: true,
      });
    }
  }

  // Get available delivery slots
  async getAvailableSlots(date?: Date): Promise<any[]> {
    const now = new Date();
    const startDate = date || now;

    const slots = await prisma.deliverySlot.findMany({
      where: {
        date: {
          gte: startDate,
        },
        available: true,
        booked: {
          lt: prisma.deliverySlot.fields.capacity,
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 50,
    });

    return slots.map((slot) => ({
      ...slot,
      availableCapacity: slot.capacity - slot.booked,
      isFull: slot.booked >= slot.capacity,
    }));
  }

  // Schedule a delivery
  async scheduleDelivery(input: ScheduleDeliveryInput): Promise<any> {
    // Check if delivery already exists for this order
    const existing = await prisma.delivery.findUnique({
      where: { orderId: input.orderId },
    });

    if (existing) {
      throw new Error('Delivery already scheduled for this order');
    }

    // If slot is specified, validate and book it
    let estimatedDelivery: Date | undefined;
    if (input.slotId) {
      const slot = await prisma.deliverySlot.findUnique({
        where: { id: input.slotId },
      });

      if (!slot) {
        throw new Error('Invalid delivery slot');
      }

      if (slot.booked >= slot.capacity) {
        throw new Error('Delivery slot is full');
      }

      // Update slot booking
      await prisma.deliverySlot.update({
        where: { id: input.slotId },
        data: { booked: { increment: 1 } },
      });

      // Calculate estimated delivery time
      const [hours, minutes] = slot.startTime.split(':').map(Number);
      estimatedDelivery = new Date(slot.date);
      estimatedDelivery.setHours(hours, minutes, 0, 0);
    }

    // Create delivery
    const delivery = await prisma.delivery.create({
      data: {
        orderId: input.orderId,
        userId: input.userId,
        slotId: input.slotId,
        preference: input.preference,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        deliveryInstructions: input.deliveryInstructions,
        estimatedDelivery,
        status: DeliveryStatus.SCHEDULED,
      },
      include: {
        slot: true,
      },
    });

    // Create initial status update
    await prisma.deliveryUpdate.create({
      data: {
        deliveryId: delivery.id,
        status: DeliveryStatus.SCHEDULED,
        message: 'Delivery scheduled',
      },
    });

    // Invalidate cache
    await redisClient.del(`delivery:${delivery.id}`);

    return delivery;
  }

  // Get delivery by ID
  async getDelivery(deliveryId: string): Promise<any> {
    // Try cache first
    const cached = await redisClient.get(`delivery:${deliveryId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        slot: true,
        driver: true,
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    // Cache for 5 minutes
    await redisClient.setex(`delivery:${deliveryId}`, 300, JSON.stringify(delivery));

    return delivery;
  }

  // Get delivery by order ID
  async getDeliveryByOrderId(orderId: string): Promise<any> {
    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
      include: {
        slot: true,
        driver: true,
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return delivery;
  }

  // Get user's deliveries
  async getUserDeliveries(userId: string): Promise<any[]> {
    return await prisma.delivery.findMany({
      where: { userId },
      include: {
        slot: true,
        driver: true,
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update delivery status
  async updateStatus(deliveryId: string, input: UpdateStatusInput): Promise<any> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    // Update delivery
    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: input.status,
        latitude: input.latitude,
        longitude: input.longitude,
        actualDelivery: input.status === DeliveryStatus.DELIVERED ? new Date() : undefined,
      },
      include: {
        slot: true,
        driver: true,
      },
    });

    // Create status update
    await prisma.deliveryUpdate.create({
      data: {
        deliveryId,
        status: input.status,
        message: input.message,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    });

    // Invalidate cache
    await redisClient.del(`delivery:${deliveryId}`);

    return updated;
  }

  // Update delivery preferences
  async updatePreferences(
    deliveryId: string,
    preference: DeliveryPreference,
    instructions?: string
  ): Promise<any> {
    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        preference,
        deliveryInstructions: instructions,
      },
    });

    // Invalidate cache
    await redisClient.del(`delivery:${deliveryId}`);

    return delivery;
  }

  // Assign driver (simulated in development)
  async assignDriver(deliveryId: string, driverId: string): Promise<any> {
    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: { driverId },
      include: {
        driver: true,
      },
    });

    await prisma.deliveryUpdate.create({
      data: {
        deliveryId,
        status: delivery.status,
        message: `Driver ${delivery.driver?.name} assigned`,
      },
    });

    // Invalidate cache
    await redisClient.del(`delivery:${deliveryId}`);

    return delivery;
  }

  // Get delivery tracking info
  async getTrackingInfo(deliveryId: string): Promise<any> {
    const delivery = await this.getDelivery(deliveryId);

    return {
      id: delivery.id,
      orderId: delivery.orderId,
      status: delivery.status,
      estimatedDelivery: delivery.estimatedDelivery,
      actualDelivery: delivery.actualDelivery,
      currentLocation: delivery.latitude && delivery.longitude
        ? { latitude: delivery.latitude, longitude: delivery.longitude }
        : null,
      driver: delivery.driver
        ? {
            name: delivery.driver.name,
            phone: delivery.driver.phone,
            vehicleType: delivery.driver.vehicleType,
            rating: delivery.driver.rating,
            location: delivery.driver.latitude && delivery.driver.longitude
              ? { latitude: delivery.driver.latitude, longitude: delivery.driver.longitude }
              : null,
          }
        : null,
      timeline: delivery.updates.map((update: any) => ({
        status: update.status,
        message: update.message,
        timestamp: update.createdAt,
        location: update.latitude && update.longitude
          ? { latitude: update.latitude, longitude: update.longitude }
          : null,
      })),
    };
  }

  // Simulate delivery progress (for development)
  async simulateDeliveryProgress(deliveryId: string): Promise<void> {
    const statuses = [
      { status: DeliveryStatus.PREPARING, message: 'Order is being prepared' },
      { status: DeliveryStatus.READY_FOR_PICKUP, message: 'Order is ready for pickup' },
      { status: DeliveryStatus.OUT_FOR_DELIVERY, message: 'Driver is on the way' },
      { status: DeliveryStatus.DELIVERED, message: 'Order delivered successfully' },
    ];

    for (const { status, message } of statuses) {
      await this.updateStatus(deliveryId, { status, message });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    }
  }
}

export const deliveryService = new DeliveryService();
