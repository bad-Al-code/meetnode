import { Request, Response, NextFunction } from 'express';

import { SignupBody } from '@/schema/auth.schema';
import logger from '@/config/logger';
import { StatusCodes } from 'http-status-codes';
import { createUser } from '@/services/user.service';

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
