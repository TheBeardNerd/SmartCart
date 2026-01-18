import Redis from 'ioredis';
import { config } from '../config';

export const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('error', (error) => {
  console.error('Redis Client Error:', error);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

export default redisClient;
