import winston from "winston";
import { env } from "../config";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const level = () => {
  return env.NODE_ENV === "development" ? "debug" : "warn";
};

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  ...(env.NODE_ENV === "production"
    ? [winston.format.colorize({ all: true })]
    : []),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [new winston.transports.Console()];

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

if (env.NODE_ENV !== "test") {
  process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });

  process.on("uncaughtException", (error) => {
    logger.error(`Uncaught Exception: ${error.message}`, {
      stack: error.stack,
    });
  });
}

export { logger };
