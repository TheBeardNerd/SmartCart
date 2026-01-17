import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../utils/redis';
import { logger } from '../utils/logger';
import { EmailService } from '../services/email-service';
import { SMSService } from '../services/sms-service';

const connection = redisClient;

export interface NotificationJob {
  type: 'email' | 'sms' | 'push';
  userId: string;
  data: any;
  priority?: 'high' | 'medium' | 'low';
}

export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

/**
 * Add notification job to queue
 */
export async function queueNotification(data: NotificationJob): Promise<void> {
  const priority = data.priority === 'high' ? 1 : data.priority === 'medium' ? 5 : 10;

  await notificationQueue.add('send-notification', data, {
    priority,
    delay: data.priority === 'high' ? 0 : 1000, // High priority sends immediately
  });

  logger.info(`Notification queued: ${data.type} for user ${data.userId}`);
}

/**
 * Worker to process notification jobs
 */
const worker = new Worker(
  'notifications',
  async (job: Job<NotificationJob>) => {
    const { type, userId, data } = job.data;
    const startTime = Date.now();

    logger.info(`Processing notification job ${job.id}: ${type} for user ${userId}`);

    try {
      switch (type) {
        case 'email':
          await EmailService.sendEmail(data);
          break;
        case 'sms':
          await SMSService.sendSMS(data);
          break;
        case 'push':
          // Push notification implementation
          logger.info('Push notification not yet implemented');
          break;
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      const duration = Date.now() - startTime;
      logger.info(`Job ${job.id} completed in ${duration}ms`);

      return { success: true, duration };
    } catch (error) {
      logger.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10,
      duration: 1000, // Rate limit: 10 jobs per second
    },
  }
);

// Job event handlers
worker.on('completed', (job, returnvalue) => {
  logger.info(`✅ Job ${job.id} completed: ${JSON.stringify(returnvalue)}`);
});

worker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on('stalled', (jobId) => {
  logger.warn(`⚠️  Job ${jobId} stalled`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down notification worker...');
  await worker.close();
  await notificationQueue.close();
  process.exit(0);
});

export { worker };
