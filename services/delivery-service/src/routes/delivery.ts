import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { deliveryService } from '../services/delivery.service';
import { authenticate } from '../middleware/auth';
import { DeliveryPreference, DeliveryStatus } from '@prisma/client';

const ScheduleDeliverySchema = z.object({
  orderId: z.string().uuid(),
  slotId: z.string().uuid().optional(),
  preference: z.nativeEnum(DeliveryPreference),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(5),
  deliveryInstructions: z.string().optional(),
});

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
  message: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const UpdatePreferencesSchema = z.object({
  preference: z.nativeEnum(DeliveryPreference),
  instructions: z.string().optional(),
});

export async function deliveryRoutes(fastify: FastifyInstance) {
  // Get available delivery slots
  fastify.get('/slots', async (request, reply) => {
    try {
      const { date } = request.query as { date?: string };

      const startDate = date ? new Date(date) : undefined;
      const slots = await deliveryService.getAvailableSlots(startDate);

      reply.send({
        success: true,
        data: { slots },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Schedule a delivery (authenticated)
  fastify.post('/schedule', { preHandler: authenticate }, async (request, reply) => {
    try {
      const data = ScheduleDeliverySchema.parse(request.body);

      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const delivery = await deliveryService.scheduleDelivery({
        ...data,
        userId: request.user.userId,
      });

      reply.send({
        success: true,
        data: delivery,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get delivery by ID (authenticated)
  fastify.get('/delivery/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const delivery = await deliveryService.getDelivery(id);

      // Verify user owns this delivery
      if (delivery.userId !== request.user?.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied',
        });
      }

      reply.send({
        success: true,
        data: delivery,
      });
    } catch (error: any) {
      reply.status(error.message === 'Delivery not found' ? 404 : 500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get delivery by order ID (authenticated)
  fastify.get('/order/:orderId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { orderId } = request.params as { orderId: string };

      const delivery = await deliveryService.getDeliveryByOrderId(orderId);

      if (!delivery) {
        return reply.status(404).send({
          success: false,
          error: 'Delivery not found',
        });
      }

      // Verify user owns this delivery
      if (delivery.userId !== request.user?.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied',
        });
      }

      reply.send({
        success: true,
        data: delivery,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get user's deliveries (authenticated)
  fastify.get('/my-deliveries', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const deliveries = await deliveryService.getUserDeliveries(request.user.userId);

      reply.send({
        success: true,
        data: { deliveries },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Update delivery status (authenticated - for admin/driver)
  fastify.put('/delivery/:id/status', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = UpdateStatusSchema.parse(request.body);

      const delivery = await deliveryService.updateStatus(id, data);

      reply.send({
        success: true,
        data: delivery,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      reply.status(error.message === 'Delivery not found' ? 404 : 500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Update delivery preferences (authenticated)
  fastify.put('/delivery/:id/preferences', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = UpdatePreferencesSchema.parse(request.body);

      const delivery = await deliveryService.getDelivery(id);

      // Verify user owns this delivery
      if (delivery.userId !== request.user?.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied',
        });
      }

      const updated = await deliveryService.updatePreferences(
        id,
        data.preference,
        data.instructions
      );

      reply.send({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      reply.status(error.message === 'Delivery not found' ? 404 : 500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get delivery tracking info
  fastify.get('/track/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const trackingInfo = await deliveryService.getTrackingInfo(id);

      reply.send({
        success: true,
        data: trackingInfo,
      });
    } catch (error: any) {
      reply.status(error.message === 'Delivery not found' ? 404 : 500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Simulate delivery progress (development only)
  fastify.post('/delivery/:id/simulate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Start simulation in background
      deliveryService.simulateDeliveryProgress(id).catch(console.error);

      reply.send({
        success: true,
        message: 'Delivery simulation started',
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Generate delivery slots (admin endpoint)
  fastify.post('/slots/generate', async (request, reply) => {
    try {
      const { daysAhead } = request.body as { daysAhead?: number };

      await deliveryService.generateSlots(daysAhead || 14);

      reply.send({
        success: true,
        message: 'Delivery slots generated',
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
