import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';

dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    });

    // Health check
    fastify.get('/health', async () => {
      return { status: 'healthy', service: 'admin-service' };
    });

    // Register routes
    await fastify.register(authRoutes);
    await fastify.register(dashboardRoutes);

    // Start server
    const port = parseInt(process.env.PORT || '3011');
    await fastify.listen({ port, host: '0.0.0.0' });

    console.log(`✅ Admin Service running on port ${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

start();
