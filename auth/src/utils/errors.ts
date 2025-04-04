import { throws } from 'assert';
import { stat } from 'fs';
import { StatusCodes } from 'http-status-codes';

interface IApiError {
  message: string;
  statusCode: StatusCodes;
  details?: any;
}
export class BaseError extends Error {
  public name: string;

  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

export class ApiError extends BaseError implements IApiError {
  public readonly statusCode: StatusCodes;
  public readonly details?: any;

  constructor(statusCode: StatusCodes, message: string, details?: any) {
    super('ApiError', message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', details?: any) {
    super(StatusCodes.BAD_REQUEST, message, details);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found', details?: any) {
    super(StatusCodes.NOT_FOUND, message, details);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized ', details?: any) {
    super(StatusCodes.UNAUTHORIZED, message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(StatusCodes.FORBIDDEN, message, details);
    this.name = 'ForbiddenError';
  }
}
