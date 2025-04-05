import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export const getAllUsersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const adminUserId = req.session.user?.id;

  try {
    res.status(StatusCodes.OK).json({
      message: 'Admin access granted.',
      data: [
        { id: 'user1', email: 'user1@example.com', role: 'user' },
        { id: 'user2', email: 'user2@example.com', role: 'user' },
        {
          id: req.session.user?.id,
          email: req.session.user?.email,
          role: 'admin',
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};
