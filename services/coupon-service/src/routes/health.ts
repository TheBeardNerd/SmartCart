import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { redisClient } from '../utils/redis';

const prisma = new PrismaClient();

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    try {
      // Check database
      await prisma.$queryRaw`SELECT 1`;

      // Check Redis
      await redisClient.ping();

      reply.send({
        status: 'healthy',
        service: 'coupon-service',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      });
    } catch (error) {
      reply.status(503).send({
        status: 'unhealthy',
        service: 'coupon-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/ready', async (request, reply) => {
    reply.send({
      status: 'ready',
      service: 'coupon-service',
    });
  });
}
