import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',

  // Service URLs
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://localhost:3001',
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3007',
  deliveryServiceUrl: process.env.DELIVERY_SERVICE_URL || 'http://localhost:3008',
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',

  // Optimization Settings
  freeDeliveryThreshold: parseFloat(process.env.FREE_DELIVERY_THRESHOLD || '35.00'),
  baseDeliveryFee: parseFloat(process.env.BASE_DELIVERY_FEE || '4.99'),
  defaultOptimizationMode: process.env.DEFAULT_OPTIMIZATION_MODE || 'price',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
};
