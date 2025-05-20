import { StatusCodes } from "http-status-codes";

export interface FormattedZodIssue {
  path: string;
  message: string;
}

export class BaseError extends Error {
  public readonly statusCode: StatusCodes;
  public readonly details?:
    | Record<string, unknown>
    | string
    | FormattedZodIssue[];

  constructor(
    name: string,
    statusCode: StatusCodes,
    message: string,
    details?: Record<string, unknown> | string | FormattedZodIssue[]
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.statusCode = statusCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
