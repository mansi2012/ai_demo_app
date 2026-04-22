import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const PASSWORD_RESET_EMAIL_QUEUE = 'send-password-reset-email';

export interface PasswordResetEmailJob {
  to: string;
  name: string;
  resetUrl: string;
}

export const passwordResetEmailQueue = new Queue<PasswordResetEmailJob>(
  PASSWORD_RESET_EMAIL_QUEUE,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }
);
