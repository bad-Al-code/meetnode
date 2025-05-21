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
  return jwt.sign({ ...payload, type: "access" }, secret, { expiresIn });
};

export const signRefreshToken = (
  payload: Omit<RefreshTokenPayload, "type" | "tokenId"> & { tokenId: string }
): string => {
  return jwt.sign({ ...payload, type: "refresh" }, secret, { expiresIn });
};

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, secret) as AccessTokenPayload;

    if (decoded.type !== "access") return null;

    return decoded;
  } catch (error) {
    logger.error("Invalid JWT or error during verification:", error);
    return null;
  }
};

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, secret) as RefreshTokenPayload;

    if (decoded.type !== "refresh") return null;

    return decoded;
  } catch (error) {
    logger.warn(`Invalid refresh JWT or error during verification.`);

    return null;
  }
};
