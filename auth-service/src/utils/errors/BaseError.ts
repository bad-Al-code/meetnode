import { throws } from "assert";
import { StatusCodes } from "http-status-codes";

export class BaseError extends Error {
  public readonly statusCode: StatusCodes;
  public readonly details?: Record<string, unknown> | string;

  constructor(
    name: string,
    statusCode: StatusCodes,
    message: string,
    details?: Record<string, unknown> | string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.statusCode = statusCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
