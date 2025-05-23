import jwt from "jsonwebtoken";

import { env } from "../config";
import { logger } from "./logger";

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  type: "access";
}

export interface RefreshTokenPayload {
  userId: string;
  type: "refresh";
  tokenId?: string;
}

const secret = env.JWT_SECRET;
const expiresIn = env.JWT_EXPIRES_IN;

export const signAccessToken = (
  payload: Omit<AccessTokenPayload, "type">
): string => {
  if (!secret) {
    logger.error(`JET_SECRET is not defined. Cannot sign access token.`);

    throw new Error("JET Siging error: Access token secret not configured");
  }

  return jwt.sign({ ...payload, type: "access" }, secret, { expiresIn });
};

export const signRefreshToken = (
  payload: Omit<RefreshTokenPayload, "type" | "tokenId"> & { tokenId: string }
): string => {
  if (!secret) {
    logger.error(
      "JWT_REFRESH_SECRET is not defined. Cannot sign refresh token."
    );

    throw new Error("JWT signing error: Refresh token secret not configured.");
  }

  return jwt.sign({ ...payload, type: "refresh" }, secret, { expiresIn });
};

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  if (!secret) {
    logger.error("JWT_SECRET is not defined. Cannot verify access token.");

    throw new Error(
      "JWT verification error: Access token secret not configured."
    );
  }

  try {
    const decoded = jwt.verify(token, secret) as AccessTokenPayload;

    if (decoded.type !== "access") {
      logger.warn("Token provided was not an access token.", {
        tokenType: decoded.type,
      });

      return null;
    }

    return decoded;
  } catch (error) {
    logger.error("Invalid JWT or error during verification:", error);
    return null;
  }
};

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload | null => {
  if (!secret) {
    logger.error(
      "JWT_REFRESH_SECRET is not defined. Cannot verify refresh token."
    );

    throw new Error(
      "JWT verification error: Refresh token secret not configured."
    );
  }

  try {
    const decoded = jwt.verify(token, secret) as RefreshTokenPayload;

    if (decoded.type !== "refresh") {
      logger.warn("Token provided was not a refresh token.", {
        tokenType: decoded.type,
      });

      return null;
    }

    return decoded;
  } catch (error) {
    logger.warn(`Invalid refresh JWT or error during verification.`);

    return null;
  }
};
