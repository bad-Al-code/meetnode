import { StatusCodes } from "http-status-codes";
import { BaseError, FormattedZodIssue } from "./BaseError";

export class BadRequestError extends BaseError {
  constructor(
    message: string = "Bad Request",
    details?: Record<string, unknown> | string | FormattedZodIssue[]
  ) {
    super("BadRequestError", StatusCodes.BAD_REQUEST, message, details);
  }
}
