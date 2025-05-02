import express, {
  Express,
  NextFunction,
  Request,
  Response,
  json,
  urlencoded,
} from 'express';
import swaggerui, { JsonObject } from 'swagger-ui-express';
import path from 'node:path';
import yaml from 'js-yaml';

import config from './config';
import logger from './shared/utils/logger';
import { StatusCodes } from 'http-status-codes';
import { NotFoundError } from './shared/errors';
import { errorHandler } from './middleware/errorHandler.middleware';
import { chatRouter } from './modules/chat/chat.routes';
import { readFileSync } from 'node:fs';

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

try {
  const openApiPath = path.resolve(__dirname, '../docs/openapi.yml');
  const swaggerDocument = yaml.load(readFileSync(openApiPath, 'utf8'));

  app.use(
    '/api-docs',
    swaggerui.serve,
    swaggerui.setup(swaggerDocument as JsonObject)
  );
} catch (error) {
  logger.error(
    { err: error },
    'Failed to load or parse OpenaAPI document for swagger UI.'
  );
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  const error = new NotFoundError(
    `Resource not found at ${req.method} ${req.originalUrl}`
  );

  next(error);
});

app.use(errorHandler);

export { app };
