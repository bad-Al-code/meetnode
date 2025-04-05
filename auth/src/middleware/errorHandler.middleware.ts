import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';

import { env } from '@/config/env';
import logger from '@/config/logger';
import { ApiError, BaseError } from '@/utils/errors';

interface IErrorResponse {
  message: string;
  statusCode: number;
  details?: any;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error({ err }, 'Error occurred');

  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected internal server error occured.';
  let details: any | undefined = undefined;

  if (err instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = 'Input validation failed.';
    details = err.flatten().fieldErrors;
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof BaseError) {
    message = err.message;
  } else {
    if (env.NODE_ENV !== 'prod') {
      message = err.message || message;
      details = { stack: err.stack };
    }
  }

  const responseBody: IErrorResponse[] = [
    {
      message,
      statusCode,
      ...(details && { details }),
    },
  ];

  if (res.headersSent) {
    logger.warn('Headers already sent, cannot send error response.');
    return;
  }

  res.status(statusCode).json(responseBody);
};
