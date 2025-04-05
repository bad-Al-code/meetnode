import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

import { LoginBody, SignupBody } from '@/schema/auth.schema';
import logger from '@/config/logger';
import {
  createUser,
  findOrCreateUserForGithub,
  findUserByEmail,
  GitHubUserData,
} from '@/services/user.service';
import {
  BadRequestError,
  InternalServerError,
  UnauthorizedError,
} from '@/utils/errors';
import { verifyPassword } from '@/utils/hash';
import { env } from '@/config/env';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { setMaxIdleHTTPParsers } from 'http';
import { intersect } from 'drizzle-orm/gel-core';

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

interface GithubUser {
  id: number;
  login: string;
  name?: string;
  email?: string | null;
  avatar_url?: string;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: 'public' | 'private' | null;
}

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

    const userApiUrl = 'https://api.github.com/user';
    const userResponse = await axios.get<GithubUser>(userApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const githubUser: GithubUser = userResponse.data;

    if (!githubUser || !githubUser.id) {
      throw new InternalServerError(
        `Could not retrieve user profile from Github.`
      );
    }

    let primaryEmail: string | null = githubUser.email!;
    if (!primaryEmail) {
      const emailApiUrl = 'https://api.github.com/user/emails';

      try {
        const emailResponse = await axios.get<GithubEmail[]>(emailApiUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        const emails: GithubEmail[] = emailResponse.data;
        const primaryVerifiedEmail = emails.find(
          (e) => e.primary && e.verified
        );

        if (primaryVerifiedEmail) {
          primaryEmail = primaryVerifiedEmail.email;
        } else {
          const anyVerifiedEmail = emails.find((e) => e.verified);
          if (anyVerifiedEmail) {
            primaryEmail = anyVerifiedEmail.email;
          } else {
            throw new BadRequestError(
              `Could not find a verified email address associated with your Github acccount.`
            );
          }
        }
      } catch (emailError: any) {
        throw new InternalServerError(
          `Failed tp retrieve email information from Github.`
        );
      }
    }

    if (!primaryEmail) {
      throw new InternalServerError(
        `Failed to retieve email information from Github.`
      );
    }

    const userDataForService: GitHubUserData = {
      id: githubUser.id,
      login: githubUser.login,
      name: githubUser.name,
      email: primaryEmail,
      avatar_url: githubUser.avatar_url,
    };

    const localUser = await findOrCreateUserForGithub(userDataForService);

    const sessionUser = {
      id: localUser.id,
      role: localUser.role,
      email: localUser.email,
      username: localUser.username,
    };

    req.session.regenerate((err) => {
      if (err) {
        return next(
          new InternalServerError(
            `Login Failed. Could not login for user ${localUser.id}`
          )
        );
      }

      req.session.user = sessionUser;

      res.status(StatusCodes.OK).json({
        message:
          'Github OAuth state verified. Token exchange and login pending',
        user: sessionUser,
      });
    });
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.message) {
      logger.error(
        {
          err: {
            message: error.message,
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
          },
        },
        `Axios error during GitHub API call (${error.response?.status})`
      );

      if (error.response?.status === 401) {
        next(
          new UnauthorizedError(
            `Invalid or expired Github token. Please try loggin in again`
          )
        );
      } else {
        next(new InternalServerError(`Failed to communicate with Github API.`));
      }
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
      logger.error(
        { err: error },
        'Unexpected error processing GitHub OAuth callback'
      );

      next(
        new InternalServerError(
          'An unexpected error occured during Github login'
        )
      );
    }
  }
};
