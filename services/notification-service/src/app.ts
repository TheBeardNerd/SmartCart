import express, { Express } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { SocketServer } from './websocket/socket-server';
import { NotificationService } from './services/notification-service';
import { createNotificationRoutes } from './routes/notifications';
import { createHealthRoutes } from './routes/health';
import { redisClient } from './utils/redis';

const app: Express = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Initialize WebSocket server
const socketServer = new SocketServer(httpServer);
logger.info('WebSocket server initialized');

// Initialize notification service
const notificationService = new NotificationService(socketServer);
logger.info('Notification service initialized');

// Routes
app.use('/', createHealthRoutes(socketServer));
app.use('/api/notifications', createNotificationRoutes(notificationService));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Startup sequence
async function start() {
  try {
    // Test Redis connection
    await redisClient.ping();
    logger.info('Redis connected successfully');

    // Start HTTP server (includes WebSocket server)
    httpServer.listen(config.port, '0.0.0.0', () => {
      logger.info(`Notification service started on port ${config.port}`);
      logger.info(`WebSocket server listening on ws://localhost:${config.port}`);
    });

    // Log connection stats periodically
    setInterval(async () => {
      const connectionCount = await socketServer.getConnectionCount();
      logger.info(`Active WebSocket connections: ${connectionCount}`);
    }, 60000); // Every minute

  } catch (err) {
    logger.error('Startup error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  try {
    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Close Redis connection
    await redisClient.quit();
    logger.info('Redis connection closed');

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the server
start();

export { app, socketServer, notificationService };
