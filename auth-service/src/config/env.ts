import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().positive().int().default(3000),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().positive().int().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().default(0),
  OTP_REDIS_PREFIX: z
    .string()
    .min(1, { message: "OTP_REDIS_PREFIX is required" }),
  OTP_VERIFY_ATTEMPTS_PREFIX: z
    .string()
    .min(1, { message: "OTP_VERIFY_ATTEMPTS_PREFIX is required" }),

  OTP_EXPIRY_SECONDS: z.coerce.number().positive().int().default(300),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().positive().int().default(5),
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
