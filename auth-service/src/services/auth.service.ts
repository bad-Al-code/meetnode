import { randomBytes } from "node:crypto";
import { env } from "../config";
import { redisClient } from "../config/redisClient";
import {
  InitiateEmailOtpInput,
  RefreshTokenInput,
  VerifyEmailOtpInput,
} from "../schemas/auth.schema";
import {
  AuthenticationError,
  BadRequestError,
  BaseError,
  NotFoundError,
} from "../utils/errors";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { logger } from "../utils/logger";
import { userInfo } from "node:os";
import { StatusCodes } from "http-status-codes";

export const initiateEmailOtp = async (
  input: InitiateEmailOtpInput
): Promise<{ message: string; otp_for_testing?: string }> => {
  const { email } = input;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpKey = `${env.OTP_REDIS_PREFIX}${email}`;
  const attemptsKey = `${env.OTP_VERIFY_ATTEMPTS_PREFIX}${email}`;

  try {
    const pipeline = redisClient.pipeline();
    pipeline.set(otpKey, otp, "EX", env.OTP_EXPIRY_SECONDS);
    pipeline.del(attemptsKey);
    await pipeline.exec();

    logger.info(
      `OTP for ${email} stored in Redis, Key: ${otpKey}, Expires in: ${env.OTP_EXPIRY_SECONDS}s`
    );
  } catch (error) {
    logger.error(`Error storing OTP in Redis for enail ${email}: `, error);

    throw error;
  }

  // TODO: send OTP via email
  logger.info(`(Placeholder) Email would be sent to ${email} with OTP: ${otp}`);

  const response: { message: string; otp_for_testing?: string } = {
    message: "OTP initiiation process started. Check your email.",
  };

  if (env.NODE_ENV === "development") {
    response.otp_for_testing = otp;
  }

  return response;
};

export const verifyEmailOtp = async (
  input: VerifyEmailOtpInput
): Promise<{ message: string; accessToken: string; refreshToken: string }> => {
  const { email, otp: providedOtp } = input;
  const otpKey = `${env.OTP_REDIS_PREFIX}${email}`;
  const attemptsKey = `${env.OTP_VERIFY_ATTEMPTS_PREFIX}${email}`;

  const storedOtp = await redisClient.get(otpKey);

  if (!storedOtp) {
    logger.warn(`OTP not found or expired for ${email}. Key: ${otpKey}`);

    await redisClient.del(attemptsKey);

    throw new NotFoundError(
      `OTP not found or has expired. Please request a new OTP`
    );
  }

  const attemptsCountStr = await redisClient.get(attemptsKey);
  const attemptsCount = attemptsCountStr ? parseInt(attemptsCountStr, 10) : 0;

  if (attemptsCount >= env.OTP_MAX_VERIFY_ATTEMPTS) {
    logger.warn(
      `Max OTP verification attempts reached for ${email}. Key: ${otpKey}`
    );

    await redisClient.del(otpKey);
    await redisClient.del(attemptsKey);

    throw new BadRequestError(
      `Max verification attempts reached. Please request a new OTP.`,
      { attempts_count: attemptsCount + 1 }
    );
  }

  if (storedOtp !== providedOtp) {
    const newAttemptsCount = await redisClient.incr(attemptsKey);
    const currentAttemptsTTL = await redisClient.ttl(attemptsKey);

    if (currentAttemptsTTL === -1) {
      await redisClient.expire(attemptsKey, env.OTP_EXPIRY_SECONDS);
    }

    logger.info(
      `Invalid OTP provided for ${email}. Povided ${providedOtp}, Expected: ${storedOtp}. Attemps: ${newAttemptsCount}`
    );

    throw new BadRequestError("Invalid OTP provided", {
      attempts_left: env.OTP_MAX_VERIFY_ATTEMPTS - newAttemptsCount,
      attempts_made: newAttemptsCount,
    });
  }

  await redisClient.del(otpKey);
  await redisClient.del(attemptsKey);

  // TODO: check if user exists
  // TODO: if user does not exits, create them
  // TODO: Generate JWT
  const simulateUserId = `user_${randomBytes(8).toString("hex")}`;
  const accessTokenPayload: Omit<AccessTokenPayload, "type"> = {
    userId: simulateUserId,
    email,
  };

  const accessToken = signAccessToken(accessTokenPayload);
  const refreshTokenId = randomBytes(16).toString("hex");
  const refreshTokenPayload: Omit<RefreshTokenPayload, "type" | "tokenId"> & {
    tokenId: string;
  } = {
    userId: simulateUserId,
    tokenId: refreshTokenId,
  };

  const refreshToken = signRefreshToken(refreshTokenPayload);

  const refreshTokenKey = `${env.REFRESH_TOKEN_REDIS_PREFIX}${simulateUserId}:${refreshTokenId}`;

  try {
    await redisClient.set(
      refreshTokenKey,
      "active",
      "EX",
      env.JWT_REFRESH_EXPIRES_IN
    );
  } catch (error) {
    throw new BaseError(
      `TokenStorageError`,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to store refresh token session."
    );
  }

  return {
    message: "OTP verified successfully. Logged in.",
    accessToken,
    refreshToken,
  };
};

export const refreshAccesstoken = async (
  input: RefreshTokenInput
): Promise<{ accessToken: string }> => {
  const { refreshToken: providedRefreshToken } = input;
  const decodedPayload = verifyRefreshToken(providedRefreshToken);

  if (!decodedPayload || !decodedPayload.tokenId) {
    throw new AuthenticationError("Invalid or expired refresh token");
  }

  const { userId, tokenId } = decodedPayload;
  const refreshTokenKey = `${env.REFRESH_TOKEN_REDIS_PREFIX}${userId}:${tokenId}`;
  const storedTokenState = await redisClient.get(refreshTokenKey);

  if (!storedTokenState || storedTokenState !== "active") {
    logger.warn(
      `Refresh token not found in redis or inactive for user ${userId}, tokenId: ${tokenId}. Possible resuse or revocation.`
    );

    throw new AuthenticationError(
      "Refresh token is invalid, expired or has be revoked."
    );
  }

  const accessTokenPayload: Omit<AccessTokenPayload, "type"> = {
    userId,
    email: "test@test.com",
  };

  const newAccessToken = signAccessToken(accessTokenPayload);

  return { accessToken: newAccessToken };
};
