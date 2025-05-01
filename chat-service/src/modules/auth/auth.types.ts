export interface JwtPayload {
  userId: string;
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: string;
  nbf?: string;
  iat?: number;
  jti?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      validatedData?: { params?: any; query?: any; body?: any };
    }
  }
}

export {};
