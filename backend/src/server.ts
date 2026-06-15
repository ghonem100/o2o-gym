import 'dotenv/config';
import app from './app';
import { connectDB, disconnectDB } from './lib/prisma';
import { startReminderScheduler, stopReminderScheduler } from './modules/notifications/scheduler';
import logger from './utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start(): Promise<void> {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`O2O Gym API running on port ${PORT} [${process.env.NODE_ENV}]`);
  });

  startReminderScheduler();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down`);
    stopReminderScheduler();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    process.exit(1);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
