import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const addFavoriteSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  store: z.string().min(1, 'Store is required'),
  price: z.number().positive('Price must be positive'),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
});

export async function favoriteRoutes(fastify: FastifyInstance) {
  /**
   * GET /favorites
   * Get all favorites for the authenticated user
   */
  fastify.get(
    '/favorites',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Get all favorites',
        tags: ['favorites'],
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

        const favorites = await prisma.favorite.findMany({
          where: { userId: request.user.userId },
          orderBy: { addedAt: 'desc' },
        });

        reply.send({
          success: true,
          data: { favorites },
        });
      } catch (error) {
        fastify.log.error('Get favorites error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to get favorites',
        });
      }
    }
  );

  /**
   * POST /favorites
   * Add a product to favorites
   */
  fastify.post(
    '/favorites',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Add product to favorites',
        tags: ['favorites'],
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

        const validatedData = addFavoriteSchema.parse(request.body);

        // Check if already favorited
        const existing = await prisma.favorite.findFirst({
          where: {
            userId: request.user.userId,
            productId: validatedData.productId,
            store: validatedData.store,
          },
        });

        if (existing) {
          reply.status(409).send({
            success: false,
            error: 'Product already in favorites',
            data: { favorite: existing },
          });
          return;
        }

        const favorite = await prisma.favorite.create({
          data: {
            ...validatedData,
            userId: request.user.userId,
          },
        });

        reply.status(201).send({
          success: true,
          data: { favorite },
          message: 'Added to favorites',
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

        fastify.log.error('Add favorite error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to add favorite',
        });
      }
    }
  );

  /**
   * DELETE /favorites/:id
   * Remove a product from favorites
   */
  fastify.delete(
    '/favorites/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Remove product from favorites',
        tags: ['favorites'],
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
        const existing = await prisma.favorite.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
        });

        if (!existing) {
          reply.status(404).send({
            success: false,
            error: 'Favorite not found',
          });
          return;
        }

        await prisma.favorite.delete({
          where: { id: request.params.id },
        });

        reply.send({
          success: true,
          message: 'Removed from favorites',
        });
      } catch (error) {
        fastify.log.error('Delete favorite error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to remove favorite',
        });
      }
    }
  );

  /**
   * GET /favorites/check/:productId
   * Check if a product is favorited
   */
  fastify.get(
    '/favorites/check/:productId',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Check if product is favorited',
        tags: ['favorites'],
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
        };

        if (request.query.store) {
          where.store = request.query.store;
        }

        const favorite = await prisma.favorite.findFirst({ where });

        reply.send({
          success: true,
          data: {
            isFavorite: !!favorite,
            favorite: favorite || null,
          },
        });
      } catch (error) {
        fastify.log.error('Check favorite status error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to check favorite status',
        });
      }
    }
  );
}
