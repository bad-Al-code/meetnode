import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../shared/errors';
import { authService } from '../modules/auth/auth.service';

export const authenticatJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new UnauthorizedError('Authorization header is missing or malformed')
    );
  }

  const token = authHeader.substring(7);
  if (!token) {
    return next(new UnauthorizedError('Bearer token is missing'));
  }

  try {
    const payload = authService.verifyToken(token);

    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};
