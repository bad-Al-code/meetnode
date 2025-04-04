import { createClient, RedisClientType } from '@redis/client';

import logger from './logger';
import { env } from './env';

const redisUrl = `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;

const redisClient: RedisClientType = createClient({
  url: redisUrl,
});

redisClient.on('connect', () => {
  logger.info('Redis client connected successfully and ready to use.');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error: ', err);
});

redisClient.on('end', () => {
  logger.warn('Redis client connection closed.');
});

redisClient.connect().catch((err) => {
  logger.error('Failed to connect Redis client on startup: ', err);
});

const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    if (redisClient.isOpen) {
      logger.info('Disconnecting Redis client due to app termination...');
      await redisClient.disconnect();
      logger.info('Redis client disconnected.');
    }
  });
});

export default redisClient;
