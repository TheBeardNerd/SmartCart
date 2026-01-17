import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3004'),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT configuration (for WebSocket authentication)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  },

  // Service URLs
  services: {
    catalog: process.env.CATALOG_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
  },

  // Email configuration (SendGrid)
  email: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    from: process.env.FROM_EMAIL || 'noreply@smartcart.com',
    enabled: process.env.EMAIL_ENABLED === 'true',
  },

  // SMS configuration (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    enabled: process.env.SMS_ENABLED === 'true',
  },

  // Push notifications (future)
  push: {
    enabled: process.env.PUSH_ENABLED === 'true',
  },
};
