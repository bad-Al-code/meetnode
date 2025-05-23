import { StatusCodes } from "http-status-codes";
import { randomBytes } from "node:crypto";

import { env } from "../config";
import { redisClient } from "../config/redisClient";
import {
  InitiateEmailOtpInput,
  LogoutInput,
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
  verifyRefreshToken,
} from "../utils/jwt";
import { logger } from "../utils/logger";
import { googleOAuth2Client } from "../config/googleOAuthClient";
import {
  GOOGLE_USER_ID_PREFIX,
  OTP_REDIS_PREFIX,
  OTP_VERIFY_ATTEMPTS_PREFIX,
  REFRESH_TOKEN_REDIS_PREFIX,
} from "../constants/redis.constants";
import { convertTimeStringToSeconds } from "../utils/time";

const getRefreshExpiresInSeconds = (): number => {
  return convertTimeStringToSeconds(env.JWT_EXPIRES_IN, 7 * 24 * 60 * 60);
};

export const initiateEmailOtp = async (
  input: InitiateEmailOtpInput
): Promise<{ message: string; otp_for_testing?: string }> => {
  const { email } = input;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpKey = `${OTP_REDIS_PREFIX}${email}`;
  const attemptsKey = `${OTP_VERIFY_ATTEMPTS_PREFIX}${email}`;

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
    message: "OTP initiation process started. Check your email.",
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
  const otpKey = `${OTP_REDIS_PREFIX}${email}`;
  const attemptsKey = `${OTP_VERIFY_ATTEMPTS_PREFIX}${email}`;

  const storedOtp = await redisClient.get(otpKey);

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

  if (!storedOtp) {
    logger.warn(`OTP not found or expired for ${email}. Key: ${otpKey}`);

    await redisClient.del(attemptsKey);

    throw new NotFoundError(
      `OTP not found or has expired. Please request a new OTP`
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

  const refreshTokenKey = `${REFRESH_TOKEN_REDIS_PREFIX}${simulateUserId}:${refreshTokenId}`;

  try {
    await redisClient.set(
      refreshTokenKey,
      "active",
      "EX",
      getRefreshExpiresInSeconds()
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
  const refreshTokenKey = `${REFRESH_TOKEN_REDIS_PREFIX}${userId}:${tokenId}`;
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

export const handleGoogleOAuthCallback = async (
  code: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  newAccount: boolean;
}> => {
  try {
    const { tokens } = await googleOAuth2Client.getToken(code);

    if (!tokens.id_token) {
      logger.error("Google token exchange failed: No ID token received.");

      throw new AuthenticationError(
        "Google Login Failed: Could not retieve user identity"
      );
    }

    const ticket = await googleOAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const googlePayload = ticket.getPayload();

    if (!googlePayload || !googlePayload.email || !googlePayload.sub) {
      throw new AuthenticationError(
        `Goolge Login Failed: Invlid user information`
      );
    }

    const googleId = googlePayload.sub;
    const email = googlePayload.email;
    const name = googlePayload.name || "";
    const picture = googlePayload.picture || "";

    logger.info(
      `Google ID token verified for ${email}, Google ID: ${googleId}`
    );

    let internalUserId: string;
    let newAccount = false;

    const googleUserKey = `${GOOGLE_USER_ID_PREFIX}${googleId}`;
    const storedInternalId = await redisClient.get(googleUserKey);

    if (storedInternalId) {
      internalUserId = storedInternalId;

      logger.info(
        `Existing user found for Google ID ${googleId}: internal ID ${internalUserId}`
      );
    } else {
      internalUserId = `user_${randomBytes(8).toString("hex")}`;
      await redisClient.set(googleUserKey, internalUserId);

      newAccount = true;

      logger.info(
        `New user created for Google ID ${googleId}: internal ID: ${internalUserId}`
      );
    }

    const accessTokenPayload: Omit<AccessTokenPayload, "type"> = {
      userId: internalUserId,
      email,
    };
    const accessToken = signAccessToken(accessTokenPayload);
    const refreshTokenId = randomBytes(16).toString("hex");
    const refreshTokenPayload: Omit<RefreshTokenPayload, "type" | "tokenId"> & {
      tokenId: string;
    } = { userId: internalUserId, tokenId: refreshTokenId };
    const refreshToken = signRefreshToken(refreshTokenPayload);
    const refreshTokenKey = `${REFRESH_TOKEN_REDIS_PREFIX}${internalUserId}:${refreshTokenId}`;

    await redisClient.set(
      refreshTokenKey,
      "active",
      "EX",
      getRefreshExpiresInSeconds()
    );

    return { accessToken, refreshToken, newAccount };
  } catch (error) {
    logger.error(
      `Error during Google OAuth token echange or ID token verification: `,
      error
    );

    if (error instanceof BaseError) {
      throw error;
    }

    throw new AuthenticationError(
      `Google login failed due to an internal error.`,
      error instanceof Error ? error.message : String(error)
    );
  }
};

export const logout = async (
  input: LogoutInput
): Promise<{ message: string }> => {
  const { refreshToken: providedRefreshToken } = input;
  const decodedPayload = verifyRefreshToken(providedRefreshToken);
  if (!decodedPayload || !decodedPayload.userId || !decodedPayload.tokenId) {
    throw new AuthenticationError(`Invalid refresh token`);
  }

  const { userId, tokenId } = decodedPayload;
  const refreshTokenKey = `${REFRESH_TOKEN_REDIS_PREFIX}${userId}:${tokenId}`;

  try {
    const deletedCount = await redisClient.del(refreshTokenKey);
    if (deletedCount === 0) {
      logger.warn(
        `Logout: Refresh token for user ${userId}, tokenId ${tokenId} not found in Redis or already revoked.`
      );

      return { message: "Session already logged out or not found." };
    }

    return { message: "Logged out successfully." };
  } catch (error) {
    throw new BaseError(
      `LogoutError`,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to log out due to internal error"
    );
  }
};

export const revokeAllUserTokens = async (userId: string): Promise<number> => {
  logger.info(`Revoking all refresh tokens for user: ${userId}`);
  const keys = await redisClient.keys(
    `${REFRESH_TOKEN_REDIS_PREFIX}${userId}:*`
  );
  if (keys.length > 0) {
    const deletedCount = await redisClient.del(...keys);
    logger.info(`Revoked ${deletedCount} refresh token for user ${userId}`);

    return deletedCount;
  }

  logger.info(`No refresh token found to revoke for user ${userId}`);
  return 0;
};
