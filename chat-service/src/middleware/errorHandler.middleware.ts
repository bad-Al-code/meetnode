import { Request, Response, NextFunction } from 'express';
import { ReasonPhrases } from 'http-status-codes';
import { ZodError } from 'zod';

import {
  ApiError,
  ValidationError,
  InternalServerError,
} from '../shared/errors';
import config from '../config';
import logger from '../shared/utils/logger';

const formatZodError = (error: ZodError): string => {
  const issues = error.errors
    .map((issue) => `[${issue.path.join('.') || 'field'}]: ${issue.message}`)
    .join(', ');
  return `Validation failed: ${issues}`;
};

export const errorHandler = (
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let errorInstance: ApiError;

  if (err instanceof ZodError) {
    const message = formatZodError(err);
    errorInstance = new ValidationError(message);
  } else if (err instanceof ApiError) {
    errorInstance = err;
  } else {
    logger.error({ err, path: req.path }, 'Caught unknown error type!');
    errorInstance = new InternalServerError(
      config.isProduction ? ReasonPhrases.INTERNAL_SERVER_ERROR : err.message
    );
  }

  res.status(errorInstance.statusCode).json({
    error: [errorInstance.statusCode, errorInstance.message],
  });
};
