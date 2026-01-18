import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3006'),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

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

  // Service URLs
  services: {
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    catalog: process.env.CATALOG_SERVICE_URL || 'http://localhost:3001',
    coupon: process.env.COUPON_SERVICE_URL || 'http://localhost:3005',
  },

  // Recommendation settings
  recommendations: {
    cacheExpiry: 3600, // 1 hour in seconds
    maxRecommendations: 20,
    minSimilarityScore: 0.3,
    reorderWindowDays: 30, // Check last 30 days for reorder predictions
  },
};
