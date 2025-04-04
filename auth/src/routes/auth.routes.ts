import { Router } from 'express';

import {
  getCurrentUserHandler,
  loginHandler,
  signupHandler,
} from '@/controllers/auth.controller';
import { validateRequest } from '@/middleware/validateRequest.middleware';
import { loginSchema, signupSchema } from '@/schema/auth.schema';
import { requireAuth } from '@/middleware/auth.middleware';

const router = Router();

router.post('/signup', validateRequest(signupSchema), signupHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);
router.get('/me', requireAuth, getCurrentUserHandler);

export { router as authRouter };
