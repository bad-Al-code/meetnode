import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';

import { env } from '@/config/env';
import logger from '@/config/logger';
import * as schema from './schema';

const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .getConnection()
  .then((connection) => {
    logger.info('MySQL Database created successfully!');
    connection.release();
  })
  .catch((err) => {
    logger.error(`Failed to connect to MySQL Database: ${err}`);
    process.exit(1);
  });

export const db = drizzle(pool, { schema, mode: 'default' });

export { pool as dbPool };
