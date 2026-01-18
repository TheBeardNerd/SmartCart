import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3010', 10),
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
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://localhost:3001',

  // Review Settings
  maxPhotosPerReview: parseInt(process.env.MAX_PHOTOS_PER_REVIEW || '5', 10),
  minReviewLength: parseInt(process.env.MIN_REVIEW_LENGTH || '10', 10),
  maxReviewLength: parseInt(process.env.MAX_REVIEW_LENGTH || '5000', 10),
  autoApproveVerifiedPurchases: process.env.AUTO_APPROVE_VERIFIED_PURCHASES === 'true',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
};
