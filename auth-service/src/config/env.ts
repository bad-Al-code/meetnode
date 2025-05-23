import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().positive().int().default(3001),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().positive().int().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().default(0),

  OTP_EXPIRY_SECONDS: z.coerce.number().positive().int().default(300),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().positive().int().default(5),

  JWT_SECRET: z
    .string()
    .min(32, { message: "JWT_SECRET must be at least 32 characters long" }),
  JWT_EXPIRES_IN: z.string().default("1h"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { message: "JWT_SECRET must be at least 32 characters long" }),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  GOOGLE_CLIENT_ID: z
    .string()
    .min(1, { message: "GOOGLE_CLIENT_ID is required" }),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1, { message: "GOOGLE_CLIENT_SECRET is required" }),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url({ message: "GOOGLE_REDIRECT_URI must be a valid url" }),
  FRONTEND_REDIRECT_URI: z.string().url({
    message: "FRONTEND_REDIRECT_URI must be a valid URL for frontend redirect",
  }),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    `Invalid environemnt variable: `,
    JSON.stringify(parsedEnv.error.format(), null, 4)
  );

  process.exit(1);
}

export const env = parsedEnv.data;

export type Env = z.infer<typeof envSchema>;
