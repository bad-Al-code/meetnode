export interface JwtPayload {
  userId: string;
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: string;
  nbf?: string;
  iat?: string;
  jti?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
