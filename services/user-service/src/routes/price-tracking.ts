import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const subscribeToPriceDropSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  store: z.string().min(1, 'Store is required'),
  currentPrice: z.number().positive('Price must be positive'),
  targetPrice: z.number().positive().optional(),
  priceDropPercent: z.number().min(1).max(100).default(10),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
});

const updateTrackingSchema = z.object({
  targetPrice: z.number().positive().optional(),
  priceDropPercent: z.number().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function priceTrackingRoutes(fastify: FastifyInstance) {
  /**
   * GET /price-tracking
   * Get all price tracking subscriptions for the authenticated user
   */
  fastify.get(
    '/price-tracking',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Get all price tracking subscriptions',
        tags: ['price-tracking'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const trackings = await prisma.priceTracking.findMany({
          where: {
            userId: request.user.userId,
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        reply.send({
          success: true,
          data: { trackings },
        });
      } catch (error) {
        fastify.log.error('Get price trackings error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to get price trackings',
        });
      }
    }
  );

  /**
   * POST /price-tracking
   * Subscribe to price drop notifications for a product
   */
  fastify.post(
    '/price-tracking',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Subscribe to price drop notifications',
        tags: ['price-tracking'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const validatedData = subscribeToPriceDropSchema.parse(request.body);

        // Check if already tracking this product
        const existing = await prisma.priceTracking.findFirst({
          where: {
            userId: request.user.userId,
            productId: validatedData.productId,
            store: validatedData.store,
          },
        });

        if (existing) {
          // Reactivate if it was deactivated
          const updated = await prisma.priceTracking.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              currentPrice: validatedData.currentPrice,
              targetPrice: validatedData.targetPrice,
              priceDropPercent: validatedData.priceDropPercent,
              notified: false,
            },
          });

          reply.send({
            success: true,
            data: { tracking: updated },
            message: 'Price tracking reactivated',
          });
          return;
        }

        // Create new tracking
        const tracking = await prisma.priceTracking.create({
          data: {
            userId: request.user.userId,
            productId: validatedData.productId,
            productName: validatedData.productName,
            store: validatedData.store,
            initialPrice: validatedData.currentPrice,
            currentPrice: validatedData.currentPrice,
            targetPrice: validatedData.targetPrice,
            priceDropPercent: validatedData.priceDropPercent,
            imageUrl: validatedData.imageUrl,
            category: validatedData.category,
          },
        });

        reply.status(201).send({
          success: true,
          data: { tracking },
          message: 'Successfully subscribed to price tracking',
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
          return;
        }

        fastify.log.error('Subscribe to price tracking error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to subscribe to price tracking',
        });
      }
    }
  );

  /**
   * GET /price-tracking/:id
   * Get a specific price tracking by ID
   */
  fastify.get(
    '/price-tracking/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Get price tracking by ID',
        tags: ['price-tracking'],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const tracking = await prisma.priceTracking.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
        });

        if (!tracking) {
          reply.status(404).send({
            success: false,
            error: 'Price tracking not found',
          });
          return;
        }

        reply.send({
          success: true,
          data: { tracking },
        });
      } catch (error) {
        fastify.log.error('Get price tracking error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to get price tracking',
        });
      }
    }
  );

  /**
   * PATCH /price-tracking/:id
   * Update a price tracking subscription
   */
  fastify.patch(
    '/price-tracking/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Update price tracking',
        tags: ['price-tracking'],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const validatedData = updateTrackingSchema.parse(request.body);

        // Verify ownership
        const existing = await prisma.priceTracking.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
        });

        if (!existing) {
          reply.status(404).send({
            success: false,
            error: 'Price tracking not found',
          });
          return;
        }

        const updated = await prisma.priceTracking.update({
          where: { id: request.params.id },
          data: validatedData,
        });

        reply.send({
          success: true,
          data: { tracking: updated },
          message: 'Price tracking updated successfully',
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
          return;
        }

        fastify.log.error('Update price tracking error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to update price tracking',
        });
      }
    }
  );

  /**
   * DELETE /price-tracking/:id
   * Delete/unsubscribe from a price tracking
   */
  fastify.delete(
    '/price-tracking/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Delete price tracking subscription',
        tags: ['price-tracking'],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        // Verify ownership
        const existing = await prisma.priceTracking.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
        });

        if (!existing) {
          reply.status(404).send({
            success: false,
            error: 'Price tracking not found',
          });
          return;
        }

        await prisma.priceTracking.delete({
          where: { id: request.params.id },
        });

        reply.send({
          success: true,
          message: 'Price tracking deleted successfully',
        });
      } catch (error) {
        fastify.log.error('Delete price tracking error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to delete price tracking',
        });
      }
    }
  );

  /**
   * GET /price-tracking/product/:productId
   * Check if a product is being tracked
   */
  fastify.get(
    '/price-tracking/product/:productId',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Check if product is being tracked',
        tags: ['price-tracking'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { productId: string }; Querystring: { store?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const where: any = {
          userId: request.user.userId,
          productId: request.params.productId,
          isActive: true,
        };

        if (request.query.store) {
          where.store = request.query.store;
        }

        const tracking = await prisma.priceTracking.findFirst({ where });

        reply.send({
          success: true,
          data: {
            isTracking: !!tracking,
            tracking: tracking || null,
          },
        });
      } catch (error) {
        fastify.log.error('Check tracking status error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to check tracking status',
        });
      }
    }
  );
}
