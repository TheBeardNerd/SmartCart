import { FastifyInstance } from 'fastify';
import { inventoryService } from '../services/inventory.service';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const checkStockSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      store: z.string(),
      quantity: z.number().min(1),
    })
  ),
});

const reserveStockSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      store: z.string(),
      quantity: z.number().min(1),
    })
  ),
  orderId: z.string().optional(),
});

const notificationSchema = z.object({
  productId: z.string(),
  store: z.string(),
  email: z.string().email(),
});

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Get stock level for a product
  fastify.get<{
    Querystring: { productId: string; store: string };
  }>('/stock', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const { productId, store } = request.query;
      const available = await inventoryService.getAvailableStock(productId, store);
      const inventory = await inventoryService.getOrCreateInventory(productId, store, 'Product');

      reply.send({
        success: true,
        data: {
          productId,
          store,
          available,
          total: inventory.quantity,
          status: inventory.status,
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to check stock',
      });
    }
  });

  // Check stock for multiple items (batch)
  fastify.post<{
    Body: z.infer<typeof checkStockSchema>;
  }>('/stock/check', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const validatedData = checkStockSchema.parse(request.body);
      const results = await inventoryService.checkStockBatch(validatedData.items);

      reply.send({
        success: true,
        data: { results },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error.message || 'Failed to check stock',
        });
      }
    }
  });

  // Reserve stock (authenticated)
  fastify.post<{
    Body: z.infer<typeof reserveStockSchema>;
  }>('/stock/reserve', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const validatedData = reserveStockSchema.parse(request.body);
      const userId = request.user!.userId;

      const result = await inventoryService.reserveStock(
        userId,
        validatedData.items,
        validatedData.orderId
      );

      reply.send({
        success: true,
        data: result,
        message: `Stock reserved until ${result.expiresAt.toISOString()}`,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(400).send({
          success: false,
          error: error.message || 'Failed to reserve stock',
        });
      }
    }
  });

  // Release reservation
  fastify.post<{
    Params: { reservationId: string };
  }>('/stock/release/:reservationId', { preHandler: authenticate }, async (request, reply) => {
    try {
      await inventoryService.releaseReservation(request.params.reservationId);

      reply.send({
        success: true,
        message: 'Reservation released',
      });
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        error: error.message || 'Failed to release reservation',
      });
    }
  });

  // Complete reservation (order placed)
  fastify.post<{
    Params: { reservationId: string };
  }>('/stock/complete/:reservationId', { preHandler: authenticate }, async (request, reply) => {
    try {
      await inventoryService.completeReservation(request.params.reservationId);

      reply.send({
        success: true,
        message: 'Reservation completed, stock updated',
      });
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        error: error.message || 'Failed to complete reservation',
      });
    }
  });

  // Subscribe to stock notification
  fastify.post<{
    Body: z.infer<typeof notificationSchema>;
  }>('/stock/notify', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const validatedData = notificationSchema.parse(request.body);
      const userId = request.user!.userId;

      const notification = await inventoryService.subscribeToStockNotification(
        validatedData.productId,
        validatedData.store,
        userId,
        validatedData.email
      );

      reply.send({
        success: true,
        data: { notification },
        message: 'You will be notified when this item is back in stock',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(400).send({
          success: false,
          error: error.message || 'Failed to subscribe to notification',
        });
      }
    }
  });

  // Get low stock products
  fastify.get<{
    Querystring: { store?: string };
  }>('/stock/low', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const products = await inventoryService.getLowStockProducts(request.query.store);

      reply.send({
        success: true,
        data: { products, count: products.length },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get low stock products',
      });
    }
  });
}
