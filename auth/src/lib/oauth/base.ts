import { oauthProviders } from '@/db/schema';

export type OAuthProvider = (typeof oauthProviders)[number];
