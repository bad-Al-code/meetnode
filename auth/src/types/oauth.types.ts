export type OAuthProvider = 'github';

export interface OAuthProviderConfig {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  callbackUrl: string;
  scopes: string[];
  userInfoUrl?: string;
  tokenHeaders?: Record<string, string>;
  userInfoHeaders?: Record<string, string>;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  [key: string]: any;
}

export interface OAuthUserProfile {
  provider: OAuthProvider;
  id: string;
  email: string | null;
  name?: string | null;
  username?: string | null;
  picture?: string | null;
  _raw?: any;
}

export const OAUTH_TYPE_GUARD = true;
