interface CustomSessionData {
  user?: {
    id: string;
    role: 'user' | 'admin';
    email: string;
  };
}

declare module 'express-session' {
  interface SessionData extends CustomSessionData {}
}

export {};
