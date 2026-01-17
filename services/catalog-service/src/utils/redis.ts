import Redis from 'ioredis';
import { config } from '../config';

export const redisClient = new Redis(config.redis.url, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttl: number
): Promise<void> {
  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting cached data:', error);
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Error deleting cached data:', error);
  }
}
