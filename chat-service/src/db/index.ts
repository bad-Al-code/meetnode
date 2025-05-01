import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import config from '../config';
import logger from '../shared/utils/logger';
import * as schema from './schema';

if (!config.database.url) {
  throw new Error('Database URL is not defined');
}

const queryClient = postgres(config.database.url, {
  max: config.isProduction ? 10 : 5,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  onnotice: (notice) => logger.warn(`PostgreSQL Notice: ${notice.message}`),
});

const db = drizzle(queryClient, {
  schema,
  logger:
    config.isDevelopment || config.logLevel === 'trace'
      ? {
          logQuery: (query: string, params: unknown[]) => {
            if (config.isProduction && config.logLevel !== 'trace') {
              logger.trace({ query }, 'DB Query Executed');
            } else {
              logger.trace({ query, params }, 'DB Query Executed');
            }
          },
        }
      : false,
});

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    await db.execute('select 1');

    return true;
  } catch (error) {
    logger.error('Database connection verification failed:', error);
    return false;
  }
};

export const closeDbConnection = async (): Promise<void> => {
  try {
    await queryClient.end({ timeout: 5 });
  } catch (error) {
    logger.error('Error closing database connection pool:', error);
  }
};

export { db };
