import { createServer } from 'node:http';

import config from './config';
import { app } from './app';
import logger from './shared/utils/logger';
import { closeDbConnection } from './db';

const PORT = config.port;

const httpServer = createServer(app);

const shutdown = async (signal: string) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  let exitCode = 0;

  httpServer.close(async (err?: Error) => {
    if (err) {
      logger.error('Error during HTTP server shutdown:', err);
      exitCode = 1;
    } else {
      logger.info('HTTP server closed successfully.');
    }

    await closeDbConnection();

    logger.info('Graceful shutdown complete.');
    process.exit(exitCode);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Forcing exit.');

    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

httpServer.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT} [${config.env}]`);
});

process.on(
  'unhandledRejection',
  (reason: Error | any, promise: Promise<any>) => {
    logger.fatal({ reason, promise }, 'Unhandled Promise Rejection!');

    throw reason;
  }
);

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught Exception!');
  process.exit(1);
});
