import { createServer } from 'node:http';
import app from './app';
import { env } from './config/env';
import logger from './config/logger';

async function startServer() {
  try {
    const PORT = env.PORT;
    const server = createServer(app);

    server.listen(PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    });

    process.on(
      'unhandledRejection',
      (reason: Error | any, promise: Promise<any>) => {
        logger.error({ err: reason }, 'Unhandled Rejection at:', promise);
      }
    );

    process.on('uncaughtException', (err: Error) => {
      logger.fatal({ err }, 'Uncaught Exception. Shutting down...');
      process.exit(1);
    });

    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, () => {
        logger.info(`Received ${signal}. Shutting down gracefully...`);
        server.close(() => {
          logger.info('HTTP server closed.');
          process.exit(0);
        });

        setTimeout(() => {
          logger.warn('Graceful shutdown timed out. Force exiting...');
          process.exit(1);
        }, 10000).unref();
      });
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
