import { Router, Request, Response } from 'express';
import { redisClient } from '../utils/redis';
import { SocketServer } from '../websocket/socket-server';

export function createHealthRoutes(socketServer: SocketServer): Router {
  const router = Router();

  // Basic health check
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'notification-service',
    });
  });

  // Detailed health check with dependencies
  router.get('/health/detailed', async (req: Request, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'notification-service',
      dependencies: {
        redis: 'unknown',
        websocket: 'unknown',
      },
      connections: 0,
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
      // Check WebSocket
      health.connections = await socketServer.getConnectionCount();
      health.dependencies.websocket = 'ok';
    } catch (error) {
      health.dependencies.websocket = 'error';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Readiness probe
  router.get('/ready', async (req: Request, res: Response) => {
    try {
      await redisClient.ping();
      res.status(200).json({ ready: true });
    } catch (error) {
      res.status(503).json({ ready: false });
    }
  });

  // Liveness probe
  router.get('/live', (req: Request, res: Response) => {
    res.json({ alive: true });
  });

  return router;
}
