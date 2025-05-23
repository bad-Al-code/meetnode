import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import * as authService from "../services/auth.service";
import {
  InitiateEmailOtpInput,
  RefreshTokenInput,
  VerifyEmailOtpInput,
} from "../schemas/auth.schema";
import { env } from "../config";
import { AuthenticationError } from "../utils/errors";
import { logger } from "../utils/logger";

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

export const googleOAuthCallbackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, scope } = req.query;
    if (!code) {
      next(
        new AuthenticationError(
          "Google OAuth failed: No authorization code received"
        )
      );
      return;
    }

    if (typeof code !== "string") {
      next(
        new AuthenticationError(
          "Google OAuth failed: Invalid authorization code provided"
        )
      );
      return;
    }

    const { accessToken, refreshToken, newAccount } =
      await authService.handleGoogleOAuthCallback(code);

    const frontendRedirectUrl = new URL(env.FRONTEND_REDIRECT_URI);
    frontendRedirectUrl.searchParams.append("accessToken", accessToken);
    frontendRedirectUrl.searchParams.append("refreshToken", refreshToken);
    frontendRedirectUrl.searchParams.append(
      "newAccount",
      newAccount.toString()
    );

    // for httpCookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      maxAge: env.JWT_REFRESH_EXPIRES_IN,
      path: "/",
    });

    // frontendRedirectUrl.searchParams.append('accessToken', accessToken);

    res.redirect(frontendRedirectUrl.toString());
    return;
  } catch (error) {
    logger.error(
      `Error during Google OAuth calllback processing. Query: ${JSON.stringify(
        req.query
      )}`,
      error
    );

    const frontendErrorRedirectUrl = new URL(env.FRONTEND_REDIRECT_URI);
    frontendErrorRedirectUrl.searchParams.append("status", "error");
    frontendErrorRedirectUrl.searchParams.append(
      "message",
      error instanceof Error
        ? error.message
        : "An unknown error occurred during Goolge login"
    );

    res.redirect(frontendErrorRedirectUrl.toString());
    return;
  }
};
