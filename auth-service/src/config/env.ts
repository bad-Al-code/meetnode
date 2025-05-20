import { TypeOf, z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().positive().int().default(3000),
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
