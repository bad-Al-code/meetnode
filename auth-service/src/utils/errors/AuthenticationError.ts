import { StatusCodes } from "http-status-codes";
import { BaseError } from "./BaseError";

export class AuthenticationError extends BaseError {
  constructor(
    message: string = "Authentication Error",
    details?: Record<string, unknown> | string
  ) {
    super("AuthenticationEroor", StatusCodes.UNAUTHORIZED, message, details);
  }
}
