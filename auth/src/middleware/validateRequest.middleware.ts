import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AnyZodObject, ZodError } from 'zod';

import logger from '@/config/logger';

export const validateRequest =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(
          { validationError: error.flatten().fieldErrors },
          'Input validation failed'
        );

        return next(error);
      }

      logger.error(
        { err: error },
        'Unexpected error during request validation middleware'
      );

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json([
        {
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
          message: 'An internal error occured during request validation',
        },
      ]);

      return;
    }
  };
