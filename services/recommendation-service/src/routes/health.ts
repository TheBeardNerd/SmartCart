import { FastifyInstance } from 'fastify';
import { redisClient } from '../utils/redis';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    try {
      // Check Redis
      await redisClient.ping();

      reply.send({
        status: 'healthy',
        service: 'recommendation-service',
        timestamp: new Date().toISOString(),
        checks: {
          redis: 'ok',
        },
      });
    } catch (error) {
      reply.status(503).send({
        status: 'unhealthy',
        service: 'recommendation-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/ready', async (request, reply) => {
    reply.send({
      status: 'ready',
      service: 'recommendation-service',
    });
  });
}
