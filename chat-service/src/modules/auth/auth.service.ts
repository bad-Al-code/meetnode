import jwt from 'jsonwebtoken';

import config from '../../config';
import { InternalServerError, UnauthorizedError } from '../../shared/errors';
import { JwtPayload } from './auth.types';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtAlgorithm = 'HS256';

  constructor() {
    if (!config.jwt.secret) {
      throw new InternalServerError(
        'JWT secret is missing in server configuration.'
      );
    }

    this.jwtSecret = config.jwt.secret;
  }

  verifyToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        algorithms: [this.jwtAlgorithm],
      }) as JwtPayload;

      if (!payload || typeof payload.userId !== 'string') {
        throw new Error('Invalid token payload structure.');
      }

      return payload;
    } catch (error: any) {
      let errorMessage = 'Invalid Token';
      if (error instanceof jwt.TokenExpiredError)
        errorMessage = 'Token has expired';
      else if (error instanceof jwt.JsonWebTokenError) {
        errorMessage = 'Token signature or format is invalid';
      } else if (error instanceof jwt.NotBeforeError) {
        errorMessage = 'Token not active yet';
      } else {
        errorMessage = 'Token verification failed due to an unexpected error';
      }

      throw new UnauthorizedError(errorMessage);
    }
  }
}

export const authService = new AuthService();
