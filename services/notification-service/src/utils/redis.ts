import Redis from 'ioredis';
import { config } from '../config';

export const redisClient = new Redis(config.redis.url, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Separate Redis client for pub/sub
export const redisPubClient = new Redis(config.redis.url);
export const redisSubClient = redisPubClient.duplicate();

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

/**
 * Store active user connection
 */
export async function setUserConnection(userId: string, socketId: string): Promise<void> {
  const key = `user:${userId}:connections`;
  await redisClient.sadd(key, socketId);
}

/**
 * Remove user connection
 */
export async function removeUserConnection(userId: string, socketId: string): Promise<void> {
  const key = `user:${userId}:connections`;
  await redisClient.srem(key, socketId);
}

/**
 * Get all connections for a user
 */
export async function getUserConnections(userId: string): Promise<string[]> {
  const key = `user:${userId}:connections`;
  return redisClient.smembers(key);
}

/**
 * Publish event to Redis (for cross-server communication)
 */
export async function publishEvent(channel: string, data: any): Promise<void> {
  await redisPubClient.publish(channel, JSON.stringify(data));
}

/**
 * Subscribe to Redis channel
 */
export function subscribeToChannel(channel: string, callback: (data: any) => void): void {
  redisSubClient.subscribe(channel);
  redisSubClient.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  });
}
