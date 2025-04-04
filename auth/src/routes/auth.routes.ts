import { signupHandler } from '@/controllers/auth.controller';
import { validateRequest } from '@/middleware/validateRequest.middleware';
import { signupSchema } from '@/schema/auth.schema';
import { Router } from 'express';

const router = Router();

router.post('/signup', validateRequest(signupSchema), signupHandler);

export { router as authRouter };
