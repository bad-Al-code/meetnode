import { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '@/utils/errors';
import logger from '@/config/logger';

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return next(
      new UnauthorizedError('Authentication required. Please log in.')
    );
  }

  logger.debug(`User authenticated: ${req.session.user.id}`);

  next();
};
