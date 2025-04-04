import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

import { LoginBody, SignupBody } from '@/schema/auth.schema';
import logger from '@/config/logger';
import { createUser, findUserByEmail } from '@/services/user.service';
import { InternalServerError, UnauthorizedError } from '@/utils/errors';
import { verifyPassword } from '@/utils/hash';
import { env } from '@/config/env';

export const signupHandler = async (
  req: Request<unknown, unknown, SignupBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userData = req.body;

    const newUser = await createUser(userData);

    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    res.status(StatusCodes.CREATED).json({
      message: 'User registered successfully!',
      user: userResponse,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error occurred in signupHandler');

    next(error);
  }
};

export const loginHandler = async (
  req: Request<unknown, unknown, LoginBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    logger.info(`Login attempt for email: ${email}`);

    const user = await findUserByEmail(email);

    if (!user || !user.hashedPassword) {
      logger.warn(
        `Login failed: User not found or no password set for email ${email}`
      );

      throw new UnauthorizedError('Invalid email or password.');
    }

    const isPasswordValid = await verifyPassword(user.hashedPassword, password);

    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password for email ${email}`);

      throw new UnauthorizedError('Invalid email or password.');
    }

    logger.debug(`Password verified for user: ${email}. Establishing session.`);

    const sessionUser = {
      id: user.id,
      role: user.role,
    };

    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err }, 'Error regenerating session during login');
        return next(
          new UnauthorizedError('Login failed. Could not establish session.')
        );
      }

      req.session.user = sessionUser;

      logger.info(
        `User logged in successfully: ${user.email} (ID: ${user.id}). Session established.`
      );

      res.status(StatusCodes.OK).json({
        message: 'Login successful!',
        user: sessionUser,
      });
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logger.warn(`Unauthorized login attempt: ${error.message}`);
    } else {
      logger.error({ err: error }, 'Error occurred in loginHandler');
    }
    next(error);
  }
};

export const getCurrentUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionUser = req.session.user;

    if (!sessionUser) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    res.status(StatusCodes.OK).json({
      message: 'Current user retrieved successfully',
      user: sessionUser,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error occurred in getCurrentUserHandler');
    next(error);
  }
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.session.user?.id;

  req.session.destroy((err) => {
    if (err) {
      return next(
        new InternalServerError('Count not log out. Please try again.')
      );
    }
  });

  res.clearCookie(env.SESSION_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'prod',
    sameSite: 'lax',
  });

  res.status(StatusCodes.OK).json({ message: 'Logout successful.' });
};
