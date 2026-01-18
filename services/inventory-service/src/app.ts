import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { healthRoutes } from './routes/health';
import { inventoryRoutes } from './routes/inventory';
import { inventoryService } from './services/inventory.service';
import { redisClient } from './utils/redis';

const app = Fastify({
  logger: {
    level: config.isDevelopment ? 'info' : 'warn',
    transport: config.isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// Register plugins
async function registerPlugins() {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: redisClient,
  });
}

// Register routes
async function registerRoutes() {
  await app.register(healthRoutes);
  await app.register(inventoryRoutes, { prefix: '/api/inventory' });
}

// Background jobs
function setupBackgroundJobs() {
  // Clean up expired reservations every 5 minutes
  setInterval(async () => {
    try {
      const count = await inventoryService.cleanupExpiredReservations();
      if (count > 0) {
        app.log.info(`Cleaned up ${count} expired reservations`);
      }
    } catch (error) {
      app.log.error('Failed to cleanup expired reservations:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Sync stock from stores every hour (simulated in development)
  if (config.isDevelopment) {
    setInterval(async () => {
      try {
        await inventoryService.syncStockFromStores();
        app.log.info('Stock sync completed');
      } catch (error) {
        app.log.error('Failed to sync stock:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}

// Graceful shutdown
async function setupGracefulShutdown() {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, starting graceful shutdown`);

      try {
        await redisClient.quit();
        await app.close();
        app.log.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        app.log.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();
    setupBackgroundJobs();
    setupGracefulShutdown();

    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    app.log.info(`Inventory Service running on port ${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  start();
}

export { app, start };
