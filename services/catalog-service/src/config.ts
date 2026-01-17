import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // MongoDB configuration
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/smartcart',
    dbName: 'smartcart',
  },

  // Store API configurations
  stores: {
    kroger: {
      apiKey: process.env.KROGER_API_KEY || '',
      apiUrl: process.env.KROGER_API_URL || 'https://api.kroger.com/v1',
    },
    safeway: {
      apiKey: process.env.SAFEWAY_API_KEY || '',
      apiUrl: process.env.SAFEWAY_API_URL || 'https://api.safeway.com/v1',
    },
    walmart: {
      apiKey: process.env.WALMART_API_KEY || '',
      apiUrl: process.env.WALMART_API_URL || 'https://api.walmart.com/v1',
    },
    target: {
      apiKey: process.env.TARGET_API_KEY || '',
      apiUrl: process.env.TARGET_API_URL || 'https://api.target.com/v1',
    },
  },

  // Cache TTL (Time To Live) in seconds
  cache: {
    productSearchTTL: 300, // 5 minutes
    priceTTL: 300, // 5 minutes
    inventoryTTL: 180, // 3 minutes
  },
};
