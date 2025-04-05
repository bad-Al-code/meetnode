interface UserPrefences {
  theme?: 'light' | 'dark';
  language?: string;
}

interface CustomSessionData {
  user?: {
    id: string;
    role: 'user' | 'admin';
    email: string;
    username?: string | null;
  };

  prefs?: UserPrefences;
}

declare module 'express-session' {
  interface SessionData extends CustomSessionData {}
}

export {};
