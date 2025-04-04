import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

if (
  !process.env.MYSQL_HOST ||
  !process.env.MYSQL_USER ||
  !process.env.MYSQL_DATABASE
) {
  throw new Error(
    'Database environment variables (HOST, USER, DATABASE) are not set for drizzle-kit.'
  );
}

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: `mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASSWORD}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE}`,
    // host: process.env.MYSQL_HOST!,
    // user: process.env.MYSQL_USER!,
    // password: process.env.MYSQL_PASSWORD,
    // database: process.env.MYSQL_DATABASE!,
    // port: Number(process.env.MYSQL_PORT) || 3306,
  },
  verbose: true,
  strict: true,
} satisfies Config;
