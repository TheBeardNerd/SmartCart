import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { healthRoutes } from './routes/health';
import { couponRoutes } from './routes/coupons';
import { redisClient } from './utils/redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fastify: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      useDefaults: true,
      coerceTypes: true,
    },
  },
});

// Register plugins
async function registerPlugins() {
  // Security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(cors, {
    origin: config.allowedOrigins,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    global: true,
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    redis: redisClient,
  });

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(couponRoutes, { prefix: '/api' });
}

// Background jobs
function setupBackgroundJobs() {
  // Update coupon statuses every hour (check for expirations, usage limits)
  setInterval(async () => {
    try {
      const now = new Date();

      // Mark expired coupons
      await prisma.coupon.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            lt: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      // Mark depleted coupons (usage limit reached)
      const coupons = await prisma.coupon.findMany({
        where: {
          status: 'ACTIVE',
          usageLimit: {
            not: null,
          },
        },
        select: {
          id: true,
          usageLimit: true,
          usageCount: true,
        },
      });

      for (const coupon of coupons) {
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { status: 'DEPLETED' },
          });
        }
      }

      fastify.log.info('Coupon statuses updated');
    } catch (error) {
      fastify.log.error('Coupon status update error:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Run initial status check after 1 minute
  setTimeout(async () => {
    try {
      const now = new Date();
      await prisma.coupon.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            lt: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });
      fastify.log.info('Initial coupon status check completed');
    } catch (error) {
      fastify.log.error('Initial status check error:', error);
    }
  }, 60 * 1000); // 1 minute
}

// Startup sequence
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    fastify.log.info('PostgreSQL connected successfully');

    // Test Redis connection
    await redisClient.ping();
    fastify.log.info('Redis connected successfully');

    // Register all plugins and routes
    await registerPlugins();

    // Setup background jobs
    setupBackgroundJobs();

    // Start server
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    fastify.log.info(`Coupon service started on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  fastify.log.info('Shutting down gracefully...');

  try {
    await fastify.close();
    await redisClient.quit();
    await prisma.$disconnect();
    fastify.log.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    fastify.log.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
start();

export { fastify };
