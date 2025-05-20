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
  logger.error(err.message, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Something broke");
});

app.listen(PORT, () => {
  logger.info(
    `Auth service is listening on port: ${PORT}. Environment: ${NODE_ENV}`
  );
});
