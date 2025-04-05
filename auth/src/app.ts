import express, {
  Express,
  json,
  urlencoded,
  Request,
  Response,
  NextFunction,
} from 'express';
import { StatusCodes } from 'http-status-codes';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { NotFoundError } from './utils/errors';
import { errorHandler } from './middleware/errorHandler.middleware';
import { setupLogging } from './loaders/logging';
import { setupSession } from './loaders/session';
import { apiLimiterConfig } from './config/rateLimit';
import { authRouter } from './routes/auth.routes';
import { adminRouter } from './routes/admin.routes';
import { sessionRouter } from './routes/session.routes';

const app: Express = express();

app.set('trust proxy', 1);

app.use(helmet());

setupLogging(app);

app.use('/api', rateLimit(apiLimiterConfig));

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

app.use('/api/auth', authRouter);
app.use('/api/auth/admin', adminRouter);
app.use('/api/auth/session', sessionRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found.`));
});

app.use(errorHandler);

export default app;
