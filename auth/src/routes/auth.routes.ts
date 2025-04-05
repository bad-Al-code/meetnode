import { Router } from 'express';

import {
  getCurrentUserHandler,
  githubOAuthHandler,
  loginHandler,
  logoutHandler,
  signupHandler,
} from '@/controllers/auth.controller';
import { validateRequest } from '@/middleware/validateRequest.middleware';
import { loginSchema, signupSchema } from '@/schema/auth.schema';
import { requireAuth } from '@/middleware/auth.middleware';

const router = Router();

router.post('/signup', validateRequest(signupSchema), signupHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);
router.get('/me', requireAuth, getCurrentUserHandler);
router.post('/logout', requireAuth, logoutHandler);

router.get('/github', githubOAuthHandler);

export { router as authRouter };
