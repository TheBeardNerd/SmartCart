import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { optimizationService } from '../services/optimization.service';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const CartItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  price: z.number(),
  store: z.string(),
  quantity: z.number(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
});

const OptimizeCartSchema = z.object({
  items: z.array(CartItemSchema),
  mode: z.enum(['price', 'time', 'convenience']).optional(),
});

const CompareStoresSchema = z.object({
  productIds: z.array(z.string()),
});

export async function optimizationRoutes(fastify: FastifyInstance) {
  // Optimize cart
  fastify.post('/optimize', { preHandler: optionalAuthenticate }, async (request, reply) => {
    try {
      const data = OptimizeCartSchema.parse(request.body);

      const result = await optimizationService.optimizeCart(data.items, data.mode || 'price');

      reply.send({
        success: true,
        data: result,
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

  // Compare stores for specific products
  fastify.post('/compare', async (request, reply) => {
    try {
      const data = CompareStoresSchema.parse(request.body);

      const comparisons = await optimizationService.compareStores(data.productIds);

      reply.send({
        success: true,
        data: { comparisons },
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

  // Get savings summary (authenticated)
  fastify.get('/savings-summary', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const token = request.headers.authorization?.substring(7);
      if (!token) {
        return reply.status(401).send({
          success: false,
          error: 'Missing token',
        });
      }

      const summary = await optimizationService.getSavingsSummary(request.user.userId, token);

      reply.send({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
