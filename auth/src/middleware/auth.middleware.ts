import { NextFunction, Request, Response } from 'express';

import { ForbiddenError, UnauthorizedError } from '@/utils/errors';
import logger from '@/config/logger';
import { roles } from '@/db/schema';
import { P } from 'pino';

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

type Role = (typeof roles)[number];

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.session.user?.role;
    const userId = req.session.user?.id;

    if (!userRole) {
      logger.error(
        `requireRole error: User session or role missing for user ID: ${userId ?? 'unknown'}. Ensure requireAuth runs first.`
      );

      return next(
        new ForbiddenError('Aceess denied. User role information is missing.')
      );
    }

    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        `Forbidden access attempt: User ${userId} with role '${userRole}' tried to access resource requiring roles [${allowedRoles.join(', ')}]`
      );

      return next(
        new ForbiddenError(
          'Access denied. You do not have permission to access this resource.'
        )
      );
    }

    logger.debug(
      `requireRole passed: User ${userId} with role '${userRole}' has required permission ([${allowedRoles.join(', ')}])`
    );

    next();
  };
};
