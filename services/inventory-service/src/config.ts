import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3007'),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://smartcart:smartcart_dev_password@localhost:5432/smartcart_inventory',
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  },

  // Rate limiting
  rateLimit: {
    max: 100,
    timeWindow: '15 minutes',
  },

  // Service URLs
  services: {
    catalog: process.env.CATALOG_SERVICE_URL || 'http://localhost:3001',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  },

  // Stock settings
  stock: {
    reservationExpiryMinutes: parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '15'),
    lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD || '10'),
    stockSyncIntervalMinutes: parseInt(process.env.STOCK_SYNC_INTERVAL_MINUTES || '60'),
  },
};
