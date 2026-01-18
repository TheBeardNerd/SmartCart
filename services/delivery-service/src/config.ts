import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3008', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',

  // Service URLs
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3007',

  // Delivery Settings
  defaultSlotsPerHour: parseInt(process.env.DEFAULT_DELIVERY_SLOTS_PER_HOUR || '10', 10),
  sameDayCutoffHour: parseInt(process.env.SAME_DAY_CUTOFF_HOUR || '14', 10),
  maxDeliveryDaysAhead: parseInt(process.env.MAX_DELIVERY_DAYS_AHEAD || '14', 10),
  defaultDeliveryDuration: parseInt(process.env.DEFAULT_DELIVERY_DURATION_MINUTES || '30', 10),

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
};
