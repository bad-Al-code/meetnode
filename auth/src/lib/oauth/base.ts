import { Response } from 'express';

import { oauthProviders } from '@/db/schema';
import { env } from '@/config/env';

export type OAuthProvider = (typeof oauthProviders)[number];

const STATE_COOKIE_KEY = 'oauth_state';
const CODE_VERIFIER_COOKIE_KEY = 'oauth_code_verifier';
const COOKIE_MAX_AGE_SECONDS = 60 * 10;

const COOKIE_OPTIONS = {
  secure: env.NODE_ENV === 'prod',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: COOKIE_MAX_AGE_SECONDS * 1000,
  path: '/',
};

function createState(res: Response): string {
  // TODO
  throw new Error('createState function not implemeted.');
}

function createCodeVerifier(res: Response): string {
  // TODO
  throw new Error('createCodeVerifier function not implemented');
}

function getCodeVerifier(req: Request): string {
  throw new Error('getCodeVerifier function not implemented');
}
