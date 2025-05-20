import { StatusCodes } from "http-status-codes";
import { BaseError } from "./BaseError";

export class BadRequestError extends BaseError {
  constructor(
    message: string = "Bad Request",
    details?: Record<string, unknown> | string
  ) {
    super("BadRequestError", StatusCodes.BAD_REQUEST, message, details);
  }
}
