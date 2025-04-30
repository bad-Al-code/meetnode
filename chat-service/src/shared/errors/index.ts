import { StatusCodes } from 'http-status-codes';
import { ApiError } from './ApiError';

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validateion Failed') {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, StatusCodes.FORBIDDEN);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not Found') {
    super(message, StatusCodes.NOT_FOUND);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error') {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

export { ApiError };
