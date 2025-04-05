import { RedisStore } from 'connect-redis';
import session from 'express-session';
import { Express } from 'express';

import redisClient from '@/config/redis';
import { env } from '@/config/env';

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'auth_sess:',
});

const sessionOptions: session.SessionOptions = {
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
};

export function setupSession(app: Express): void {
  app.use(session(sessionOptions));
}
