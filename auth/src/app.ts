import express, {
  Express,
  json,
  urlencoded,
  Request,
  Response,
  NextFunction,
} from 'express';
import { pinoHttp } from 'pino-http';
import { StatusCodes } from 'http-status-codes';
import { RedisStore } from 'connect-redis';

import logger from './config/logger';
import { NotFoundError } from './utils/errors';
import { errorHandler } from './middleware/errorHandler.middleware';
import redisClient from './config/redis';
import session from 'express-session';
import { env } from './config/env';

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'auth_sess',
  disableTouch: true,
});

const app: Express = express();

app.set('trust proxy', 1);

app.use(
  pinoHttp({
    logger: logger,
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
    customLogLevel: function (req, res, err) {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      }
      if (res.statusCode >= 500 || err) {
        return 'error';
      }
      if (res.statusCode >= 300 && res.statusCode < 400) {
        return 'silent';
      }
      return 'info';
    },
  })
);

app.use(json());
app.use(urlencoded({ extended: true }));

app.use(
  session({
    store: redisStore,
    secret: env.SESSION_SECRET,
    name: env.SESSION_NAME,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'prod',
      httpOnly: true,
      maxAge: env.SESSION_MAX_AGE_MS,
      sameSite: 'lax',
    },
  })
);

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
