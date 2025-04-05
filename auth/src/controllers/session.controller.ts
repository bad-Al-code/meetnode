import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { UpdatePrefsBody } from '@/schema/session.shema';
import { InternalServerError } from '@/utils/errors';
import logger from '@/config/logger';

export const updatePreferencesHandler = async (
  req: Request<unknown, unknown, UpdatePrefsBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.session.user?.id;

  try {
    const prefsToUpdate = req.body;

    if (!req.session.prefs) {
      req.session.prefs = {};
    }

    if (prefsToUpdate.theme !== undefined) {
      req.session.prefs.theme = prefsToUpdate.theme;
    }

    if (prefsToUpdate.language !== undefined) {
      req.session.prefs.language = prefsToUpdate.language;
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
    logger.error(
      { err: error },
      `Error occurred in updatePreferencesHandler for user ID: ${userId}`
    );

    next(error);
  }
};
