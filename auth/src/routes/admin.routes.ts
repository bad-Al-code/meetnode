import { getAllUsersHandler } from '@/controllers/admin.controller';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { Router } from 'express';

const router = Router();

router.get('/users', requireAuth, requireRole('admin'), getAllUsersHandler);

export { router as adminRouter };
