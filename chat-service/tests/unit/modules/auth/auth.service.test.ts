import jwt from 'jsonwebtoken';

import { AuthService } from '../../../../src/modules/auth/auth.service';
import {
  UnauthorizedError,
  InternalServerError,
} from '../../../../src/shared/errors';
import config from '../../../../src/config';
import { JwtPayload } from '../../../../src/modules/auth/auth.types';

jest.mock('jsonwebtoken');

const MOCK_SECRET = 'a15285a1-52dc-4dfd-9aba-5edf005d5ec0';
const originalJwtSecret = config.jwt.secret;

describe('AuthService', () => {
  let authService: AuthService;
  let mockJwtVerify: jest.Mock;

  beforeAll(() => {
    Object.defineProperty(config.jwt, 'secret', {
      value: MOCK_SECRET,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(config.jwt, 'secret', { value: originalJwtSecret });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    mockJwtVerify = jwt.verify as jest.Mock;
  });

  it('should verify a valid token and return the payload', () => {
    const mockToken = 'valid.token.string';
    const expectedPayload: JwtPayload = {
      userId: 'user-abc-123',
      iat: 1678886400,
    };

    mockJwtVerify.mockReturnValue(expectedPayload);
    const result = authService.verifyToken(mockToken);

    expect(result).toEqual(expectedPayload);
    expect(mockJwtVerify).toHaveBeenCalledTimes(1);
    expect(mockJwtVerify).toHaveBeenCalledWith(mockToken, MOCK_SECRET, {
      algorithms: ['HS256'],
    });
  });

  it('should throw UnauthorizedError for an expired token', () => {
    const mockToken = 'expired.token.string';
    const expiryDate = new Date();
    const expiredError = new jwt.TokenExpiredError('jwt expired', expiryDate);

    mockJwtVerify.mockImplementation(() => {
      throw expiredError;
    });

    expect(() => authService.verifyToken(mockToken)).toThrow(UnauthorizedError);
    expect(() => authService.verifyToken(mockToken)).toThrow(
      'Token has expired'
    );
    expect(mockJwtVerify).toHaveBeenCalledTimes(2);
    expect(mockJwtVerify).toHaveBeenCalledWith(mockToken, MOCK_SECRET, {
      algorithms: ['HS256'],
    });
  });

  it('should throw UnauthorizedError for an invalid signature/format', () => {
    const mockToken = 'invalid.signature.token';
    const invalidSignatureError = new jwt.JsonWebTokenError(
      'invalid signature'
    );

    mockJwtVerify.mockImplementation(() => {
      throw invalidSignatureError;
    });

    expect(() => authService.verifyToken(mockToken)).toThrow(UnauthorizedError);
    expect(() => authService.verifyToken(mockToken)).toThrow(
      'Token signature or format is invalid'
    );
    expect(mockJwtVerify).toHaveBeenCalledTimes(2);
    expect(mockJwtVerify).toHaveBeenCalledWith(mockToken, MOCK_SECRET, {
      algorithms: ['HS256'],
    });
  });

  it('should throw UnauthorizedError for a token not active yet', () => {
    const mockToken = 'not.active.yet.token';
    const activationDate = new Date(Date.now() + 10000);
    const notBeforeError = new jwt.NotBeforeError(
      'jwt not active',
      activationDate
    );

    mockJwtVerify.mockImplementation(() => {
      throw notBeforeError;
    });

    expect(() => authService.verifyToken(mockToken)).toThrow(UnauthorizedError);
    expect(() => authService.verifyToken(mockToken)).toThrow(
      'Token not active yet'
    );
  });

  it('should throw UnauthorizedError for a token with missing userId in payload', () => {
    const mockToken = 'missing.userid.token';
    const invalidPayload = { iat: 1678886400 };

    mockJwtVerify.mockReturnValue(invalidPayload);

    expect(() => authService.verifyToken(mockToken)).toThrow(UnauthorizedError);
    expect(() => authService.verifyToken(mockToken)).toThrow(
      'Token verification failed'
    );
  });

  it('should throw UnauthorizedError for other unexpected jwt errors', () => {
    const mockToken = 'unexpected.error.token';
    const unexpectedError = new Error('Something weird happened');

    mockJwtVerify.mockImplementation(() => {
      throw unexpectedError;
    });

    expect(() => authService.verifyToken(mockToken)).toThrow(UnauthorizedError);
    expect(() => authService.verifyToken(mockToken)).toThrow(
      'Token verification failed due to an unexpected error'
    );
  });
});

describe('AuthService Constructor', () => {
  it('should throw InternalServerError if JWT_SECRET is missing', () => {
    Object.defineProperty(config.jwt, 'secret', {
      value: undefined,
      writable: true,
    });

    expect(() => new AuthService()).toThrow(InternalServerError);
    expect(() => new AuthService()).toThrow(
      'JWT secret is missing in server configuration.'
    );

    Object.defineProperty(config.jwt, 'secret', { value: MOCK_SECRET });
  });
});
