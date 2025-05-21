import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import * as authService from "../services/auth.service";
import {
  InitiateEmailOtpInput,
  RefreshTokenInput,
  VerifyEmailOtpInput,
} from "../schemas/auth.schema";
import { env } from "../config";

export const initiateEmailOtpHandler = async (
  req: Request<{}, {}, InitiateEmailOtpInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const serviceResponse = await authService.initiateEmailOtp(req.body);
    const responsePayload: { message: string; otp_for_testing?: string } = {
      message: serviceResponse.message,
    };

    if (env.NODE_ENV === "development" && serviceResponse.otp_for_testing) {
      responsePayload.otp_for_testing = serviceResponse.otp_for_testing;
    }

    res.status(StatusCodes.OK).json(responsePayload);
    return;
  } catch (error) {
    next(error);
  }
};

export const verifyEmailOtpHandler = async (
  req: Request<{}, {}, VerifyEmailOtpInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const serviceResponse = await authService.verifyEmailOtp(req.body);

    res.status(StatusCodes.OK).json(serviceResponse);
    return;
  } catch (error) {
    next(error);
  }
};

export const refreshAccesstokenHandler = async (
  req: Request<{}, {}, RefreshTokenInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccesstoken({ refreshToken });

    res.status(StatusCodes.OK).json(result);
    return;
  } catch (error) {
    next(error);
  }
};
