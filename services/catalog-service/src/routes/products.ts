import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ProductService } from '../services/product-service';
import { getCached, setCached } from '../utils/redis';
import { config } from '../config';

const productService = new ProductService();

// Validation schemas
const searchQuerySchema = z.object({
  query: z.string().min(1).max(100),
  store: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const productIdParamSchema = z.object({
  productId: z.string(),
});

const inventoryBodySchema = z.object({
  productIds: z.array(z.string()).min(1).max(50),
});

export async function productRoutes(fastify: FastifyInstance) {
  // Product search endpoint
  fastify.get(
    '/products/search',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 100 },
            store: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const params = searchQuerySchema.parse(request.query);
        const cacheKey = `search:${params.query}:${params.store || 'all'}:${params.category || 'all'}:${params.limit}:${params.offset}`;

        // Check cache first
        const cached = await getCached(cacheKey);
        if (cached) {
          const responseTime = Date.now() - startTime;
          reply.header('X-Response-Time', `${responseTime}ms`);
          reply.header('X-Cache-Status', 'HIT');
          return cached;
        }

        // Search products across stores
        const results = await productService.searchProducts(params);

        const response = {
          success: true,
          data: results.items,
          total: results.total,
          page: Math.floor(params.offset / params.limit) + 1,
        };

        // Cache results
        await setCached(cacheKey, response, config.cache.productSearchTTL);

        const responseTime = Date.now() - startTime;
        reply.header('X-Response-Time', `${responseTime}ms`);
        reply.header('X-Cache-Status', 'MISS');

        // Log performance warning if slow
        if (responseTime > 1000) {
          fastify.log.warn(`Slow search query: ${responseTime}ms for "${params.query}"`);
        }

        return response;
      } catch (error) {
        fastify.log.error('Search error:', error);
        reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // Price comparison endpoint
  fastify.get(
    '/products/:productId/prices',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
          },
          required: ['productId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const { productId } = productIdParamSchema.parse(request.params);
        const cacheKey = `prices:${productId}`;

        // Check cache
        const cached = await getCached(cacheKey);
        if (cached) {
          const responseTime = Date.now() - startTime;
          reply.header('X-Response-Time', `${responseTime}ms`);
          reply.header('X-Cache-Status', 'HIT');
          return cached;
        }

        // Fetch prices from all stores
        const prices = await productService.getPrices(productId);

        const response = {
          productId,
          prices: prices.validPrices,
          lowestPrice: prices.lowestPrice,
          responseTime: Date.now() - startTime,
        };

        // Cache results
        await setCached(cacheKey, response, config.cache.priceTTL);

        const responseTime = Date.now() - startTime;
        reply.header('X-Response-Time', `${responseTime}ms`);
        reply.header('X-Cache-Status', 'MISS');

        // Log performance warning if exceeds target
        if (responseTime > 500) {
          fastify.log.warn(`Price fetch exceeded target: ${responseTime}ms for product ${productId}`);
        }

        return response;
      } catch (error) {
        fastify.log.error('Price fetch error:', error);
        reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // Inventory check endpoint
  fastify.post(
    '/products/inventory',
    {
      schema: {
        body: {
          type: 'object',
          required: ['productIds'],
          properties: {
            productIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 50,
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { productIds } = inventoryBodySchema.parse(request.body);

        const inventory = await productService.checkInventory(productIds);

        return {
          success: true,
          data: inventory,
        };
      } catch (error) {
        fastify.log.error('Inventory check error:', error);
        reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // Get product by ID
  fastify.get(
    '/products/:productId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { productId } = productIdParamSchema.parse(request.params);

        const product = await productService.getProductById(productId);

        if (!product) {
          return reply.status(404).send({
            success: false,
            error: 'Product not found',
          });
        }

        return {
          success: true,
          data: product,
        };
      } catch (error) {
        fastify.log.error('Get product error:', error);
        reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );
}
