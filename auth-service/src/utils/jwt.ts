import jwt from "jsonwebtoken";
import { env } from "../config";
import { logger } from "./logger";

export interface JwtPayload {
  userId: string;
  email: string;
}

export const signJWT = (
  payload: JwtPayload,
  options?: jwt.SignOptions
): string => {
  const secret = env.JWT_SECRET;
  const expiresIn = env.JWT_EXPIRES_IN;

  return jwt.sign(payload, secret, { ...options, expiresIn });
};

export const verifyJwt = (token: string): JwtPayload | null => {
  const secret = env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    logger.error("Invalid JWT or error during verification:", error);
    return null;
  }
};
