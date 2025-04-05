import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

import { LoginBody, SignupBody } from '@/schema/auth.schema';
import logger from '@/config/logger';
import { createUser, findUserByEmail } from '@/services/user.service';
import {
  BadRequestError,
  InternalServerError,
  UnauthorizedError,
} from '@/utils/errors';
import { verifyPassword } from '@/utils/hash';
import { env } from '@/config/env';
import { randomBytes } from 'crypto';
import axios from 'axios';

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

export const githubOAuthHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const state = randomBytes(16).toString('hex');
    req.session.oauthState = state;

    const authorizationUrl = new URL(
      'https://github.com/login/oauth/authorize'
    );
    authorizationUrl.searchParams.append('client_id', env.GITHUB_CLIENT_ID);
    authorizationUrl.searchParams.append(
      'redirect_url',
      env.GITHUB_CALLBACK_URL
    );
    authorizationUrl.searchParams.append('scope', 'read:user user:email');
    authorizationUrl.searchParams.append('state', state);

    logger.info(`Redrecting user to Github for authorization. State: ${state}`);

    res.redirect(authorizationUrl.toString());
  } catch (error) {
    logger.error({ err: error }, 'Error initializing Github Oauth flow.');

    next(error);
  }
};

export const githubCallbackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { code, state } = req.query;

  const sessionState = req.session.oauthState;

  if (req.session) {
    delete req.session.oauthState;
  }

  try {
    if (!state || !sessionState || state !== sessionState) {
      throw new UnauthorizedError(
        `Invalid OAuth state. Potential CSRF attack or session issue,`
      );
    }

    if (req.query.error) {
      throw new BadRequestError(
        `Github Authoriztion failed: ${req.query.error_description || req.query.error} `
      );
    }

    if (!code || typeof code !== 'string') {
      throw new BadRequestError(
        'Github authorization failed. No code received'
      );
    }

    const tokenUrl = `https://github.com/login/oauth/access_token`;
    const tokenParams = {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_url: env.GITHUB_CALLBACK_URL,
    };

    const tokenResponse = await axios.post(tokenUrl, tokenParams, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (tokenResponse.data.error) {
      throw new InternalServerError(
        `Failed to obtain Github access token: ${tokenResponse.data.error_description || tokenResponse.data.error}`
      );
    }

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken || typeof accessToken !== 'string') {
      throw new InternalServerError(`Failed to obtain a valid github token.`);
    }

    logger.info(`GitHub access token obtained successfully.`);

    res.status(StatusCodes.OK).json({
      message: 'Github OAuth state verified. Token exchange and login pending',
    });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      next(
        new InternalServerError(
          `Failed to communicate with Github to exchange token.`
        )
      );
    } else if (
      error instanceof UnauthorizedError ||
      error instanceof BadRequestError ||
      error instanceof InternalServerError
    ) {
      if (
        error instanceof UnauthorizedError ||
        error instanceof BadRequestError
      ) {
        logger.warn(`OAuth error: ${error.message}`);
      } else {
        logger.warn(`OAuth Processing error: ${error.message}`);
      }
      next(error);
    } else {
      next(
        new InternalServerError(
          'An unexpected error occured during Github login'
        )
      );
    }
  }
};
