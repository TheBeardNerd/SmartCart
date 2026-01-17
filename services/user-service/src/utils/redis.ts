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

/**
 * Store user session data
 */
export async function setUserSession(userId: string, data: any, ttl: number = 3600): Promise<void> {
  const key = `session:${userId}`;
  await redisClient.setex(key, ttl, JSON.stringify(data));
}

/**
 * Get user session data
 */
export async function getUserSession(userId: string): Promise<any | null> {
  const key = `session:${userId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Delete user session
 */
export async function deleteUserSession(userId: string): Promise<void> {
  const key = `session:${userId}`;
  await redisClient.del(key);
}

/**
 * Cache user data
 */
export async function cacheUser(userId: string, userData: any, ttl: number = 3600): Promise<void> {
  const key = `user:${userId}`;
  await redisClient.setex(key, ttl, JSON.stringify(userData));
}

/**
 * Get cached user data
 */
export async function getCachedUser(userId: string): Promise<any | null> {
  const key = `user:${userId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const key = `user:${userId}`;
  await redisClient.del(key);
}
