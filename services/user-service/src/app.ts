import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { healthRoutes } from './routes/health';
import { priceTrackingRoutes } from './routes/price-tracking';
import { shoppingListRoutes } from './routes/shopping-lists';
import { favoriteRoutes } from './routes/favorites';
import { redisClient } from './utils/redis';
import { PrismaClient } from '@prisma/client';
import { cleanupExpiredTokens } from './utils/jwt';
import { priceMonitorService } from './services/price-monitor.service';

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
  await fastify.register(authRoutes, { prefix: '/api' });
  await fastify.register(userRoutes, { prefix: '/api' });
  await fastify.register(priceTrackingRoutes, { prefix: '/api' });
  await fastify.register(shoppingListRoutes, { prefix: '/api' });
  await fastify.register(favoriteRoutes, { prefix: '/api' });
}

// Background jobs
function setupBackgroundJobs() {
  // Clean up expired refresh tokens every hour
  setInterval(async () => {
    try {
      await cleanupExpiredTokens();
      fastify.log.info('Expired tokens cleaned up');
    } catch (error) {
      fastify.log.error('Token cleanup error:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Check product prices every 2 hours
  setInterval(async () => {
    try {
      await priceMonitorService.checkAllPrices();
      fastify.log.info('Price check completed');
    } catch (error) {
      fastify.log.error('Price check error:', error);
    }
  }, 2 * 60 * 60 * 1000); // 2 hours

  // Reset notification flags daily at 3 AM
  const scheduleResetNotifications = () => {
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);

    if (next3AM < now) {
      next3AM.setDate(next3AM.getDate() + 1);
    }

    const timeUntil3AM = next3AM.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        await priceMonitorService.resetNotificationFlags();
        fastify.log.info('Notification flags reset');
      } catch (error) {
        fastify.log.error('Reset notification flags error:', error);
      }

      // Schedule next run (24 hours)
      setInterval(async () => {
        try {
          await priceMonitorService.resetNotificationFlags();
          fastify.log.info('Notification flags reset');
        } catch (error) {
          fastify.log.error('Reset notification flags error:', error);
        }
      }, 24 * 60 * 60 * 1000);
    }, timeUntil3AM);
  };

  scheduleResetNotifications();

  // Run initial price check after 1 minute
  setTimeout(async () => {
    try {
      await priceMonitorService.checkAllPrices();
      fastify.log.info('Initial price check completed');
    } catch (error) {
      fastify.log.error('Initial price check error:', error);
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

    fastify.log.info(`User service started on port ${config.port}`);
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
