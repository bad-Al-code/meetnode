import { StatusCodes } from "http-status-codes";
import { BaseError } from "./BaseError";

export class NotFoundError extends BaseError {
  constructor(
    message: string = "Resource Not Found",
    details?: Record<string, unknown> | string
  ) {
    super("NotFoundError", StatusCodes.NOT_FOUND, message, details);
  }
}
