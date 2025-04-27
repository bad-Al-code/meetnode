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

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', details?: any) {
    super(StatusCodes.CONFLICT, message, details);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error', details?: any) {
    super(StatusCodes.INTERNAL_SERVER_ERROR, message, details);
    this.name = 'InternalServerError';
  }
}

export class InvalidStateError extends ApiError {
  constructor(
    message: string = 'Invalid OAuth State: State parameter mismatch or cookie missing.',
    details?: any
  ) {
    super(StatusCodes.BAD_REQUEST, message, details);
    this.name = 'InvalidStateError';
  }
}

export class InvalidCodeVerifierError extends ApiError {
  constructor(
    message: string = 'Invalid or missing OAuth Code Verifier cookie.',
    details: any
  ) {
    super(StatusCodes.BAD_REQUEST, message, details);
    this.name = 'InvalidCodeVerifier';
  }
}

export class InvalidTokenError extends ApiError {
  constructor(message: string = 'Invalid OAuth Token Response', details?: any) {
    super(StatusCodes.BAD_REQUEST, message, details);
    this.name = 'InvalidTokenError';
  }
}

export class InvalidUserError extends ApiError {
  constructor(
    message: string = 'Invalid OAuth User Info Response',
    details?: any
  ) {
    super(StatusCodes.BAD_GATEWAY, message, details);
    this.name = 'InvalidUserError';
  }
}

export class ValidationError extends BadRequestError {
  constructor(message: string = 'Validation Failed', details: any) {
    super(message, details);
    this.name = 'ValidationError';
  }
}
