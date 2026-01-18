import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3005'),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://smartcart:smartcart_dev_password@localhost:5432/smartcart_coupons',
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
    max: 100, // 100 requests
    timeWindow: '15 minutes',
  },

  // User service URL for auth verification
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
};
