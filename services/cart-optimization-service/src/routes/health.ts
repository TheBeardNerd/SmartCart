import { FastifyInstance } from 'fastify';
import { redisClient } from '../utils/redis';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    reply.send({
      status: 'ok',
      service: 'cart-optimization-service',
      timestamp: new Date().toISOString(),
    });
  });

  // Detailed health check with dependencies
  fastify.get('/health/detailed', async (request, reply) => {
    const health = {
      status: 'ok',
      service: 'cart-optimization-service',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: 'unknown',
      },
    };

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
      await redisClient.ping();
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
