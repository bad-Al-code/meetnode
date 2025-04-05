import { env } from './env';
import { OAuthProviderConfig, OAuthProvider } from '@/types/oauth.types';

const githubConfig: OAuthProviderConfig = {
  provider: 'github',
  clientId: env.GITHUB_CLIENT_ID,
  clientSecret: env.GITHUB_CLIENT_SECRET,
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  callbackUrl: env.GITHUB_CALLBACK_URL,
  scopes: ['read:user', 'user:email'],
  userInfoUrl: 'https://api.github.com/user',

  tokenHeaders: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },

  userInfoHeaders: {
    Accept: 'application/vnd.github.v3+json',
  },
};

export const oauthConfigs: Record<OAuthProvider, OAuthProviderConfig> = {
  github: githubConfig,
} as const;

export function getOAuthProviderConfig(
  provider: OAuthProvider
): OAuthProviderConfig {
  const config = oauthConfigs[provider];
  if (!config) {
    throw new Error(
      `OAuth configuration for provider "${provider}" is not defined or enabled.`
    );
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      `Missing Client ID or Client Secret for OAuth provider "${provider}". Check environment variables.`
    );
  }
  return config;
}
