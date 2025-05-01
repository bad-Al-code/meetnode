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
import { NotFoundError } from './shared/errors';
import { errorHandler } from './middleware/errorHandler.middleware';
import { chatRouter } from './modules/chat/chat.routes';

const app: Express = express();

app.use(json({ limit: '10kb' }));
app.use(urlencoded({ extended: true, limit: '10kb' }));

if (config.isDevelopment) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const bodyLog =
      req.body && Object.keys(req.body).length > 0
        ? JSON.stringify(req.body)
        : 'empty';
    logger.debug(
      `--> ${req.method} ${req.originalUrl} (Body: ${bodyLog.substring(0, 100)}${bodyLog.length > 100 ? '...' : ''})`
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

app.get('/health', (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'chat-service',
  });
});

app.use('/api/v1/chat', chatRouter);

app.use((req: Request, _res: Response, next: NextFunction) => {
  const error = new NotFoundError(
    `Resource not found at ${req.method} ${req.originalUrl}`
  );

  next(error);
});

app.use(errorHandler);

export { app };
