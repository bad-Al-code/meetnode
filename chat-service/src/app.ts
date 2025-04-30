import express, {
  Express,
  NextFunction,
  Request,
  Response,
  json,
  urlencoded,
} from 'express';
import config from './config';
import logger from './shared/utils/logger';
import { StatusCodes } from 'http-status-codes';

const app: Express = express();

app.use(json());
app.use(urlencoded({ extended: true }));

if (config.isDevelopment) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    logger.debug(
      `--> ${req.method} ${req.originalUrl} (Body: ${req.body ? JSON.stringify(req.body) : 'empty'})`
    );

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug(
        `<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${res.statusMessage} (${duration}ms)`
      );
    });
    next();
  });
}

app.get('/health', (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'chat-service',
  });
});

app.use((req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    error: [
      StatusCodes.NOT_FOUND,
      `Not Found - ${req.method} ${req.originalUrl}`,
    ],
  });
});

export { app };
