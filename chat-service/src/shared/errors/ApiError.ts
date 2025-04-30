import { StatusCodes } from 'http-status-codes';

export class ApiError extends Error {
  public readonly statusCode: StatusCodes;

  constructor(message: string, statusCode: StatusCodes) {
    super(message);
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}
