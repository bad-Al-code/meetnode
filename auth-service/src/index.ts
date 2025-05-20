import "dotenv/config";
import express, {
  json,
  Application,
  Request,
  Response,
  NextFunction,
} from "express";
import { StatusCodes } from "http-status-codes";

import { env } from "./config";
import { logger } from "./utils/logger";
import { BaseError } from "./utils/errors";

const PORT: number = env.PORT;
const NODE_ENV = env.NODE_ENV;

const app: Application = express();

app.use(json());

app.get("/health", (req: Request, res: Response) => {
  logger.info("Health check endpoint was called");

  res
    .status(StatusCodes.OK)
    .send(`Auth service is healthy! Running in ${NODE_ENV} mode}`);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof BaseError) {
    logger.warn(`Operational Error: ${err.name} - ${err.message}`, {
      statuscode: err.statusCode,
      details: err.details,
      url: req.originalUrl,
      method: req.method,

      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  logger.error(`Unhandled/System Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    errorObject: err,
  });

  const statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  const message =
    env.NODE_ENV === "production"
      ? "An unexpected internal server occurred"
      : err.message;

  res.status(statusCode).json({
    status: "error",
    message,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });

  return;
});

app.listen(PORT, () => {
  logger.info(
    `Auth service is listening on port: ${PORT}. Environment: ${NODE_ENV}`
  );
});
