import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { redisPubClient, redisSubClient, setUserConnection, removeUserConnection } from '../utils/redis';
import { logger } from '../utils/logger';

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

export class SocketServer {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.allowedOrigins,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupRedisAdapter();
    this.setupMiddleware();
    this.setupConnectionHandlers();
  }

  /**
   * Setup Redis adapter for horizontal scaling
   */
  private setupRedisAdapter() {
    this.io.adapter(createAdapter(redisPubClient, redisSubClient));
    logger.info('Socket.io Redis adapter configured');
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        // Get token from auth object or query params
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          logger.warn('WebSocket connection attempt without token');
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token as string, config.jwt.secret) as JWTPayload;
        socket.userId = decoded.userId;
        socket.email = decoded.email;

        logger.info(`WebSocket authenticated: ${decoded.email}`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  /**
   * Setup connection handlers
   */
  private setupConnectionHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new client connection
   */
  private async handleConnection(socket: AuthenticatedSocket) {
    if (!socket.userId) {
      socket.disconnect();
      return;
    }

    logger.info(`Client connected: ${socket.id} (User: ${socket.email})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Track connection in Redis
    await setUserConnection(socket.userId, socket.id);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to SmartCart notifications',
      timestamp: new Date().toISOString(),
    });

    // Handle subscription events
    this.handleSubscriptions(socket);

    // Handle disconnect
    socket.on('disconnect', async () => {
      logger.info(`Client disconnected: ${socket.id} (User: ${socket.email})`);
      if (socket.userId) {
        await removeUserConnection(socket.userId, socket.id);
      }
    });
  }

  /**
   * Handle subscription events
   */
  private handleSubscriptions(socket: AuthenticatedSocket) {
    // Subscribe to price updates for specific products
    socket.on('subscribe:prices', (data: { productIds: string[] }) => {
      logger.info(`User ${socket.email} subscribing to prices: ${data.productIds.length} products`);

      data.productIds.forEach((productId) => {
        socket.join(`price:${productId}`);
      });

      socket.emit('subscribed:prices', {
        productIds: data.productIds,
        count: data.productIds.length,
      });
    });

    // Unsubscribe from price updates
    socket.on('unsubscribe:prices', (data: { productIds: string[] }) => {
      data.productIds.forEach((productId) => {
        socket.leave(`price:${productId}`);
      });

      socket.emit('unsubscribed:prices', {
        productIds: data.productIds,
      });
    });

    // Subscribe to cart updates
    socket.on('subscribe:cart', () => {
      if (socket.userId) {
        socket.join(`cart:${socket.userId}`);
        socket.emit('subscribed:cart', { userId: socket.userId });
      }
    });

    // Subscribe to order updates
    socket.on('subscribe:orders', () => {
      if (socket.userId) {
        socket.join(`orders:${socket.userId}`);
        socket.emit('subscribed:orders', { userId: socket.userId });
      }
    });

    // Subscribe to all user notifications
    socket.on('subscribe:notifications', () => {
      if (socket.userId) {
        socket.join(`notifications:${socket.userId}`);
        socket.emit('subscribed:notifications', { userId: socket.userId });
      }
    });
  }

  /**
   * Emit price update to subscribers
   */
  public emitPriceUpdate(productId: string, data: any) {
    this.io.to(`price:${productId}`).emit('price:update', {
      productId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Price update emitted for product: ${productId}`);
  }

  /**
   * Emit cart update to user
   */
  public emitCartUpdate(userId: string, data: any) {
    this.io.to(`cart:${userId}`).emit('cart:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Cart update emitted for user: ${userId}`);
  }

  /**
   * Emit order update to user
   */
  public emitOrderUpdate(userId: string, data: any) {
    this.io.to(`orders:${userId}`).emit('order:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.io.to(`notifications:${userId}`).emit('notification', {
      type: 'order',
      ...data,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Order update emitted for user: ${userId}`);
  }

  /**
   * Emit general notification to user
   */
  public emitNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Notification emitted for user: ${userId}`);
  }

  /**
   * Emit to specific user (all their connections)
   */
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcast(event: string, data: any) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Get number of connected clients
   */
  public async getConnectionCount(): Promise<number> {
    const sockets = await this.io.fetchSockets();
    return sockets.length;
  }

  /**
   * Get connections for specific user
   */
  public async getUserSocketCount(userId: string): Promise<number> {
    const sockets = await this.io.in(`user:${userId}`).fetchSockets();
    return sockets.length;
  }
}
