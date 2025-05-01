import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, z, ZodError } from 'zod';

import { ValidationError } from '../shared/errors';

export const validate =
  <T extends AnyZodObject>(schema: T) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = {
        params: req.params,
        query: req.query,
        body: req.body,
      };

      const validatedData: z.infer<T> = await schema.parseAsync(dataToValidate);

      req.validatedData = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map(
            (issue) => `[${issue.path.join('.') || 'field'}]: ${issue.message}`
          )
          .join(', ');

        next(new ValidationError(`Validation failed: ${message}`));
      } else {
        next(error);
      }
    }
  };
