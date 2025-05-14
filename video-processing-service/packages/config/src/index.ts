import { z, ZodError } from "zod";
import dotenv from "dotenv";
import path from "path";

if (process.env.NODE_ENV !== "production") {
  const envPath = path.resolve(
    process.cwd().includes("apps") ? "../../.env" : ".env"
  );

  dotenv.config({ path: envPath });
}

const numericString = (defaultValue?: number) =>
  z
    .string()
    .regex(/^\d+$/, "Must be a numeric string")
    .transform(Number)
    .optional()
    .default(
      defaultValue !== undefined ? String(defaultValue) : (undefined as any)
    );

const requiredNumericString = () =>
  z.string().regex(/^\d+$/, "Must be a numeric string").transform(Number);

const requiredString = (envName: string) =>
  z
    .string({ required_error: `${envName} is required.` })
    .min(1, `${envName} cannot be empty.`);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  POSTGRES_USER: requiredString("POSTGRES_USER"),
  POSTGRES_PASSWORD: requiredString("POSTGRES_PASSWORD"),
  POSTGRES_DB: requiredString("POSTGRES_DB"),
  POSTGRES_HOST: requiredString("POSTGRES_HOST").default("localhost"),
  POSTGRES_PORT: requiredNumericString(),
  DATABASE_URL: z.string().url().optional(),

  REDIS_HOST: requiredString("REDIS_HOST"),
  REDIS_PORT: requiredNumericString(),
  REDIS_PASSWORD: z.string().optional(),

  MINIO_ENDPOINT: requiredString("MINIO_ENDPOINT").default("localhost"),
  MINIO_PORT: requiredNumericString(),
  MINIO_ACCESS_KEY: requiredString("MINIO_ACCESS_KEY"),
  MINIO_SECRET_KEY: requiredString("MINIO_SECRET_KEY"),
  MINIO_USE_SSL: z
    .preprocess((val) => String(val).toLowerCase() === "true", z.boolean())
    .default(false),
  MINIO_BUCKET_NAME: requiredString("MINIO_BUCKET_NAME"),

  NEXTJS_PORT: numericString(3000),
  API_PORT: numericString(3001),

  API_HOST: z.string().default("0.0.0.0"),

  FFMPEG_PATH: z.string().default("ffmpeg"),
});

const processEnvVars = (env: NodeJS.ProcessEnv) => {
  return {
    ...env,
    MINIO_ENDPOINT: env.MINIO_HOST || "localhost",
    MINIO_ACCESS_KEY: env.MINIO_ROOT_USER,
    MINIO_SECRET_KEY: env.MINIO_ROOT_PASSWORD,
    MINIO_BUCKET_NAME: env.MINIO_DEFAULT_BUCKET,
    DATABASE_URL:
      env.DATABASE_URL ||
      `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${
        env.POSTGRES_HOST || "localhost"
      }:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
  };
};

let validatedEnv: z.infer<typeof envSchema>;

try {
  const processed = processEnvVars(process.env);
  validatedEnv = envSchema.parse(processed);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Invalid environment variables:");
    error.errors.forEach((err) => {
      console.error(`  Path: ${err.path.join(".")}, Message: ${err.message}`);
    });
  } else {
    console.error(
      "An unexpected error occurred while parsing environment variables:",
      error
    );
  }
  process.exit(1);
}

export const config = validatedEnv;
export type AppConfig = z.infer<typeof envSchema>;
