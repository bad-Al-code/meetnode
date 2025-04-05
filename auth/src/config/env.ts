import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { z } from 'zod';

const envPath =
  process.env.NODE_ENV === 'test'
    ? resolve(cwd(), '.env.test')
    : resolve(cwd(), '.env');

const result = config({ path: envPath });
if (result.error && process.env.NODE_ENV !== 'prod') {
  console.warn(`[ENV] Could not find ${envPath} file`, result.error.message);
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['dev', 'prod', 'test']).default('dev'),
  PORT: z.coerce.number().int().positive().default(3000),

  MYSQL_HOST: z.string().min(1),
  MYSQL_PORT: z.coerce.number().int().positive(),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string().min(1),
  MYSQL_DATABASE: z.string().min(1),
  MYSQL_ROOT_PASSWORD: z.string().min(1),

  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),

  SESSION_SECRET: z
    .string()
    .min(10, 'Session secret must be at least 10 characters long.'),
  SESSION_NAME: z.string().min(1).default('auth_sid'),
  SESSION_MAX_AGE_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(24 * 60 * 60 * 1000),

  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_CALLBACK_URL: z.string().url('GITHUB_CALLBACK_URL mus be a valid URL'),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '[ENV Validation Error]',
    parsedEnv.error.flatten().fieldErrors
  );

  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data;

console.log('[ENV] Environment variables loaded and validated successfully.');

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof EnvSchema> {}
  }
}
