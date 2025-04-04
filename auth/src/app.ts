import express, {
  Express,
  json,
  urlencoded,
  Request,
  Response,
  NextFunction,
} from 'express';
import { StatusCodes } from 'http-status-codes';

import { NotFoundError } from './utils/errors';
import { errorHandler } from './middleware/errorHandler.middleware';
import { setupLogging } from './loaders/logging';
import { setupSession } from './loaders/session';

const app: Express = express();

app.set('trust proxy', 2);

setupLogging(app);

app.use(json());
app.use(urlencoded({ extended: true }));

setupSession(app);

app.get('/health', (req: Request, res: Response) => {
  res
    .status(StatusCodes.OK)
    .json({ status: 'UP', timeStamp: new Date().toISOString() });
});

app.get('/error', (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new Error('Something broke');
  } catch (error) {
    next(error);
  }
});

app.get('/apierror', (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError('Resource not found via /apierror'));
});

app.use(errorHandler);

export default app;
