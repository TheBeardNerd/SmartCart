import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { healthRoutes } from './routes/health';
import { optimizationRoutes } from './routes/optimization';
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
  await app.register(optimizationRoutes, { prefix: '/api/optimize' });
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
    setupGracefulShutdown();

    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    app.log.info(`Cart Optimization Service running on port ${config.port}`);
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
