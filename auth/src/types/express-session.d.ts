interface CustomSessionData {
  user?: {
    id: string;
    role: 'user' | 'admin';
  };
}

declare module 'express-session' {
  interface SessionData extends CustomSessionData {}
}

export {};
