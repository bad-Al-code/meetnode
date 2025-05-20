import "dotenv/config";
import express, { json, Application, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { env } from "./config";

const PORT: number = env.PORT;
const NODE_ENV = env.NODE_ENV;

const app: Application = express();

app.use(json());

app.get("/health", (req: Request, res: Response) => {
  res
    .status(StatusCodes.OK)
    .send(`Auth service is healthy! Running in ${NODE_ENV} mode}`);
});

app.listen(PORT, () => {
  console.log(
    `Auth service is listening on port: ${PORT}. Environment: ${NODE_ENV}`
  );
});
