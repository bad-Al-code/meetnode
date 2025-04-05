import { Router } from 'express';

import { updatePreferencesHandler } from '@/controllers/session.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { validateRequest } from '@/middleware/validateRequest.middleware';
import { updatePrefsSchema } from '@/schema/session.shema';

const router = Router();

router.patch(
  '/preferences',
  requireAuth,
  validateRequest(updatePrefsSchema),
  updatePreferencesHandler
);

export { router as sessionRouter };
