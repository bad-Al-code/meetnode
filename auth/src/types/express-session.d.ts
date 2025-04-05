interface UserPrefences {
  theme?: 'light' | 'dark';
  language?: string;
}

interface CustomSessionData {
  user?: {
    id: string;
    role: 'user' | 'admin';
    email?: string;
    username?: string | null;
  };

  prefs?: UserPrefences;
  oauthState?: string;
}

declare module 'express-session' {
  interface SessionData extends CustomSessionData {}
}

export {};
