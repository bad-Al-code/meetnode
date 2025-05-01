import dotenv from 'dotenv';
import path from 'node:path';
import { closeDbConnection } from '../src/db';
import logger from '../src/shared/utils/logger';

const envPath = path.resolve(__dirname, '../.env.test');
dotenv.config({ path: envPath });
logger.info('--- JEST GLOBAL SETUP ---');

jest.setTimeout(15000);

beforeAll(async () => {});
afterAll(async () => {
  logger.info('--- JEST GLOBAL TEARDOWN ---');
  await closeDbConnection();
  logger.info('Closed main DB connection pool.');
  logger.info('--- JEST GLOBAL TEARDOWN COMPLETE ---');
});

export {};
