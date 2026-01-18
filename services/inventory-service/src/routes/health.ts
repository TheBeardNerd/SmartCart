import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { redisClient } from '../utils/redis';

const prisma = new PrismaClient();

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    reply.send({
      status: 'ok',
      service: 'inventory-service',
      timestamp: new Date().toISOString(),
    });
  });

  // Detailed health check with dependencies
  fastify.get('/health/detailed', async (request, reply) => {
    const health = {
      status: 'ok',
      service: 'inventory-service',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.dependencies.database = 'ok';
    } catch (error) {
      health.dependencies.database = 'error';
      health.status = 'degraded';
    }

    // Check Redis connection
    try {
      await redisClient.ping();
      health.dependencies.redis = 'ok';
    } catch (error) {
      health.dependencies.redis = 'error';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    reply.status(statusCode).send(health);
  });

  // Ready check (for Kubernetes readiness probes)
  fastify.get('/ready', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      reply.send({ ready: true });
    } catch (error) {
      reply.status(503).send({ ready: false });
    }
  });

  // Live check (for Kubernetes liveness probes)
  fastify.get('/live', async (request, reply) => {
    reply.send({ alive: true });
  });
}
