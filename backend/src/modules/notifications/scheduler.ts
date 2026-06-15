import cron, { type ScheduledTask } from 'node-cron';
import { sendExpiryRemindersAllGyms } from './notifications.service';
import logger from '../../utils/logger';

let task: ScheduledTask | null = null;

/**
 * Starts the daily expiry-reminder job at 10:00 AM Cairo time.
 * Cron expression: minute hour day month weekday → '0 10 * * *'
 */
export function startReminderScheduler(): void {
  if (task) return;

  task = cron.schedule(
    '0 10 * * *',
    async () => {
      logger.info('Running scheduled expiry reminders (10:00 Africa/Cairo)');
      try {
        await sendExpiryRemindersAllGyms();
      } catch (err) {
        logger.error('Scheduled reminder run failed', { err });
      }
    },
    { timezone: 'Africa/Cairo' }
  );

  logger.info('Reminder scheduler started — daily at 10:00 Africa/Cairo');
}

export function stopReminderScheduler(): void {
  if (task) {
    task.stop();
    task = null;
  }
}
