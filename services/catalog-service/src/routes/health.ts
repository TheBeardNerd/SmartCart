import { FastifyInstance } from 'fastify';
import { redisClient } from '../utils/redis';
import { mongoClient } from '../utils/mongodb';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'catalog-service',
    };
  });

  // Detailed health check with dependencies
  fastify.get('/health/detailed', async (request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'catalog-service',
      dependencies: {
        redis: 'unknown',
        mongodb: 'unknown',
      },
    };

    try {
      // Check Redis
      await redisClient.ping();
      health.dependencies.redis = 'ok';
    } catch (error) {
      health.dependencies.redis = 'error';
      health.status = 'degraded';
    }

    try {
      // Check MongoDB
      await mongoClient.getDb().admin().ping();
      health.dependencies.mongodb = 'ok';
    } catch (error) {
      health.dependencies.mongodb = 'error';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    reply.status(statusCode).send(health);
  });

  // Readiness probe
  fastify.get('/ready', async (request, reply) => {
    try {
      await redisClient.ping();
      await mongoClient.getDb().admin().ping();
      reply.status(200).send({ ready: true });
    } catch (error) {
      reply.status(503).send({ ready: false });
    }
  });

  // Liveness probe
  fastify.get('/live', async () => {
    return { alive: true };
  });
}
