import Redis, { RedisOptions } from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  db: env.REDIS_DB,
};

if (env.REDIS_PASSWORD) {
  redisOptions.password = env.REDIS_PASSWORD;
}

const redisClient = new Redis(redisOptions);

redisClient.on("connect", () => {
  logger.info("Successfullt connected to redis");
});

redisClient.on("error", (error: Error) => {
  logger.info(`Redis connection error: ${error}`);

  process.exit(1);
});

const gracefulShutdown = (signal: string) => {
  redisClient.quit(() => {
    logger.info("Redis connection closed");

    process.exit(0);
  });
};

export { redisClient };
