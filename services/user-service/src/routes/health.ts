import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { redisClient } from '../utils/redis';

const prisma = new PrismaClient();

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'user-service',
    };
  });

  // Detailed health check with dependencies
  fastify.get('/health/detailed', async (request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      dependencies: {
        redis: 'unknown',
        postgresql: 'unknown',
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
      // Check PostgreSQL
      await prisma.$queryRaw`SELECT 1`;
      health.dependencies.postgresql = 'ok';
    } catch (error) {
      health.dependencies.postgresql = 'error';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    reply.status(statusCode).send(health);
  });

  // Readiness probe
  fastify.get('/ready', async (request, reply) => {
    try {
      await redisClient.ping();
      await prisma.$queryRaw`SELECT 1`;
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
