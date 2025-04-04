import { Router } from 'express';

import { loginHandler, signupHandler } from '@/controllers/auth.controller';
import { validateRequest } from '@/middleware/validateRequest.middleware';
import { loginSchema, signupSchema } from '@/schema/auth.schema';

const router = Router();

router.post('/signup', validateRequest(signupSchema), signupHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);

export { router as authRouter };
