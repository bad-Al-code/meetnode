import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { UpdatePrefsBody } from '@/schema/session.shema';
import { InternalServerError } from '@/utils/errors';

export const updatePreferencesHandler = async (
  req: Request<unknown, unknown, UpdatePrefsBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const prefsToUpdate = req.body;

    if (!req.session.prefs) {
      req.session.prefs = {};
    }

    for (const key in prefsToUpdate) {
      if (Object.prototype.hasOwnProperty.call(prefsToUpdate, key)) {
        req.session.prefs[key as keyof UpdatePrefsBody] =
          prefsToUpdate[key as keyof UpdatePrefsBody];
      }
    }

    req.session.save((err) => {
      if (err) {
        return next(
          new InternalServerError(
            `Failed to update preference. Please try again.`
          )
        );
      }

      res.status(StatusCodes.OK).json({
        message: 'Preferences updated successfully',
        preferences: req.session.prefs,
      });
    });
  } catch (error) {
    next(error);
  }
};
