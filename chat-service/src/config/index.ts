import dotenv from 'dotenv';
import path from 'node:path';

const envPath = path.resolve(
  __dirname,
  '../../',
  process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'
);

dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

interface AppConfig {
  env: string;
  port: number;
  logLevel: string;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
  };
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    url: process.env.DATABASE_URL as string,
  },
  jwt: {
    secret: process.env.JWT_SECRET as string,
  },
  get isProduction(): boolean {
    return this.env === 'production';
  },
  get isDevelopment(): boolean {
    return this.env === 'development';
  },
  get isTest(): boolean {
    return this.env === 'test';
  },
};

if (!config.database.url) {
  console.error(
    'FATAL ERROR: DATABASE_URL environment variable is not defined.'
  );
  process.exit(1);
}

if (!config.jwt.secret) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
  process.exit(1);
}

if (config.isProduction && config.jwt.secret.length < 32) {
  console.warn(
    'WARNING: JWT_SECRET appears weak. Ensure it is a long, random string in production.'
  );
}

export default Object.freeze(config);
