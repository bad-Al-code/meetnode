import http from 'http';
import config from './config';
import logger from './shared/utils/logger';
import { app } from './app';
import { closeDbConnection } from './db';
import { initializeWebSocketServer } from './websockets/ws.server';

const PORT = config.port;
const httpServer = http.createServer(app);

const shutdown = async (signal: string) => {
  let exitCode = 0;

  try {
    await closeDbConnection();
  } catch (wsError) {
    exitCode = 1;
  }

  httpServer.close(async (err?: Error) => {
    await closeDbConnection();

    process.exit(exitCode);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

httpServer.listen(PORT, () => {
  logger.info(`HTTP Server listening on port ${PORT} [${config.env}]`);
  try {
    initializeWebSocketServer(httpServer);
  } catch (error) {
    process.exit(1);
  }
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
