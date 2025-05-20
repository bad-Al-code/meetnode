import { Request, Response, NextFunction } from "express";

import * as authService from "../services/auth.service";
import { InitiateEmailOtpInput } from "../schemas/auth.schema";
import { env } from "../config";
import { StatusCodes } from "http-status-codes";

export const initiateEmailOtpHandler = async (
  req: Request<{}, {}, InitiateEmailOtpInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await authService.initiateEmailOtp(req.body);

    // TEST
    const responsePayload: any = { message: result.message };
    if (env.NODE_ENV === "development" && result.otp) {
      responsePayload.otp_for_testing = result.otp;
    }

    res.status(StatusCodes.OK).json(responsePayload);
    return;
  } catch (error) {
    next(error);
  }
};
