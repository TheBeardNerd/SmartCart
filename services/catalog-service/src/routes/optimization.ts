import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  PriceOptimizationEngine,
  CartItem,
  OptimizationStrategy,
} from '../optimization/price-optimizer';

const optimizationEngine = new PriceOptimizationEngine();

// Validation schemas
const cartItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  quantity: z.number().min(1),
  maxPrice: z.number().optional(),
  category: z.string().optional(),
});

const optimizationStrategySchema = z.object({
  type: z.enum(['budget', 'convenience', 'split-cart', 'meal-plan']),
  deliveryPreference: z.enum(['fastest', 'cheapest', 'single-trip']),
  maxStores: z.number().min(1).max(10).optional(),
  prioritizeSavings: z.boolean().optional(),
  preferredStores: z.array(z.string()).optional(),
});

const optimizeCartRequestSchema = z.object({
  cart: z.array(cartItemSchema).min(1),
  strategy: optimizationStrategySchema,
  userId: z.string().optional(),
});

const compareStrategiesRequestSchema = z.object({
  cart: z.array(cartItemSchema).min(1),
  userId: z.string().optional(),
});

export async function optimizationRoutes(fastify: FastifyInstance) {
  /**
   * POST /optimize
   * Optimize cart based on specified strategy
   */
  fastify.post(
    '/optimize',
    {
      schema: {
        description: 'Optimize shopping cart based on specified strategy',
        tags: ['optimization'],
        body: {
          type: 'object',
          required: ['cart', 'strategy'],
          properties: {
            cart: {
              type: 'array',
              items: {
                type: 'object',
                required: ['productId', 'name', 'quantity'],
                properties: {
                  productId: { type: 'string' },
                  name: { type: 'string' },
                  quantity: { type: 'number', minimum: 1 },
                  maxPrice: { type: 'number' },
                  category: { type: 'string' },
                },
              },
            },
            strategy: {
              type: 'object',
              required: ['type', 'deliveryPreference'],
              properties: {
                type: {
                  type: 'string',
                  enum: ['budget', 'convenience', 'split-cart', 'meal-plan'],
                },
                deliveryPreference: {
                  type: 'string',
                  enum: ['fastest', 'cheapest', 'single-trip'],
                },
                maxStores: { type: 'number', minimum: 1, maximum: 10 },
                prioritizeSavings: { type: 'boolean' },
                preferredStores: { type: 'array', items: { type: 'string' } },
              },
            },
            userId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  strategy: { type: 'string' },
                  totalCost: { type: 'number' },
                  estimatedSavings: { type: 'number' },
                  savingsPercentage: { type: 'number' },
                  storeBreakdown: { type: 'array' },
                  deliveryWindows: { type: 'array' },
                  optimizationTime: { type: 'number' },
                  itemCount: { type: 'number' },
                  storeCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const { cart, strategy, userId } = optimizeCartRequestSchema.parse(request.body);

        fastify.log.info(
          `Optimization request: ${strategy.type} strategy for ${cart.length} items`
        );

        const result = await optimizationEngine.optimizeCart(cart, strategy, userId);

        const totalTime = Date.now() - startTime;

        return {
          success: true,
          data: result,
          meta: {
            processingTime: totalTime,
            itemsOptimized: cart.length,
            strategyUsed: strategy.type,
          },
        };
      } catch (error) {
        fastify.log.error('Optimization error:', error);

        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          });
          return;
        }

        reply.status(500).send({
          success: false,
          error: 'Optimization failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /optimize/compare
   * Compare all optimization strategies for a cart
   */
  fastify.post(
    '/optimize/compare',
    {
      schema: {
        description: 'Compare all optimization strategies for a shopping cart',
        tags: ['optimization'],
        body: {
          type: 'object',
          required: ['cart'],
          properties: {
            cart: {
              type: 'array',
              items: {
                type: 'object',
                required: ['productId', 'name', 'quantity'],
                properties: {
                  productId: { type: 'string' },
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                },
              },
            },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const { cart, userId } = compareStrategiesRequestSchema.parse(request.body);

        fastify.log.info(`Strategy comparison request for ${cart.length} items`);

        // Run all strategies in parallel
        const strategies: OptimizationStrategy[] = [
          { type: 'budget', deliveryPreference: 'cheapest', maxStores: 1 },
          { type: 'convenience', deliveryPreference: 'fastest', maxStores: 2 },
          { type: 'split-cart', deliveryPreference: 'cheapest', maxStores: 4 },
          { type: 'meal-plan', deliveryPreference: 'single-trip', maxStores: 2 },
        ];

        const results = await Promise.all(
          strategies.map(async (strategy) => {
            try {
              const result = await optimizationEngine.optimizeCart(cart, strategy, userId);
              return {
                strategy: strategy.type,
                result,
                error: null,
              };
            } catch (error) {
              return {
                strategy: strategy.type,
                result: null,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          })
        );

        // Find the best overall option (highest savings percentage)
        const validResults = results.filter((r) => r.result !== null);
        const bestOption = validResults.reduce((best, current) =>
          current.result!.savingsPercentage > (best.result?.savingsPercentage || 0)
            ? current
            : best
        );

        const totalTime = Date.now() - startTime;

        return {
          success: true,
          data: {
            comparisons: results,
            recommendation: {
              strategy: bestOption.strategy,
              reason: `Offers ${bestOption.result!.savingsPercentage.toFixed(1)}% savings ($${bestOption.result!.estimatedSavings.toFixed(2)})`,
              result: bestOption.result,
            },
          },
          meta: {
            processingTime: totalTime,
            itemsAnalyzed: cart.length,
            strategiesCompared: strategies.length,
          },
        };
      } catch (error) {
        fastify.log.error('Strategy comparison error:', error);

        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          });
          return;
        }

        reply.status(500).send({
          success: false,
          error: 'Comparison failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /optimize/strategies
   * Get list of available optimization strategies with descriptions
   */
  fastify.get(
    '/optimize/strategies',
    {
      schema: {
        description: 'Get available optimization strategies',
        tags: ['optimization'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    bestFor: { type: 'string' },
                    typicalSavings: { type: 'string' },
                    storeCount: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      return {
        success: true,
        data: [
          {
            id: 'budget',
            name: 'Budget Optimizer',
            description: 'Find the absolute lowest total cost across all stores',
            bestFor: 'Families looking to maximize savings on their grocery budget',
            typicalSavings: '15-25%',
            storeCount: '1-2 stores',
            deliveryPreference: 'cheapest',
          },
          {
            id: 'convenience',
            name: 'Convenience Seeker',
            description: 'Minimize shopping complexity with single or dual-store orders',
            bestFor: 'Busy professionals who value time over maximum savings',
            typicalSavings: '5-10%',
            storeCount: '1 store preferred',
            deliveryPreference: 'fastest',
          },
          {
            id: 'split-cart',
            name: 'Split-Cart Maximizer',
            description: 'Get the best price for each item across multiple stores',
            bestFor: 'Strategic shoppers who want the absolute best deal on every item',
            typicalSavings: '10-15%',
            storeCount: '2-4 stores',
            deliveryPreference: 'coordinated',
          },
          {
            id: 'meal-plan',
            name: 'Meal Planner',
            description: 'Balance cost with quality for meal prep and healthy eating',
            bestFor: 'Health-conscious shoppers and meal preppers',
            typicalSavings: '8-12%',
            storeCount: '1-2 stores',
            deliveryPreference: 'quality-focused',
          },
        ],
      };
    }
  );

  /**
   * POST /optimize/estimate-savings
   * Quick savings estimate without full optimization
   */
  fastify.post(
    '/optimize/estimate-savings',
    {
      schema: {
        description: 'Get quick savings estimate for a cart',
        tags: ['optimization'],
        body: {
          type: 'object',
          required: ['cart'],
          properties: {
            cart: {
              type: 'array',
              items: {
                type: 'object',
                required: ['productId', 'quantity'],
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as { cart: Array<{ productId: string; quantity: number }> };
        const cart = body.cart.map((item) => ({
          ...item,
          name: item.productId, // Simplified for estimate
        }));

        // Run quick budget optimization
        const result = await optimizationEngine.optimizeCart(cart, {
          type: 'budget',
          deliveryPreference: 'cheapest',
          maxStores: 1,
        });

        return {
          success: true,
          data: {
            estimatedSavings: result.estimatedSavings,
            savingsPercentage: result.savingsPercentage,
            totalCost: result.totalCost,
            message: `You could save $${result.estimatedSavings.toFixed(2)} (${result.savingsPercentage.toFixed(1)}%) with SmartCart optimization`,
          },
        };
      } catch (error) {
        fastify.log.error('Savings estimate error:', error);
        reply.status(500).send({
          success: false,
          error: 'Estimation failed',
        });
      }
    }
  );
}
