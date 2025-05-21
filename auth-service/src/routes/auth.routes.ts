import { Router } from "express";

import { validateRequest } from "../middlewares/validateRequest.middleware";
import {
  initiateEmailOtpSchema,
  refreshTokenSchema,
  verifyEmailOtpSchema,
} from "../schemas/auth.schema";
import {
  initiateEmailOtpHandler,
  refreshAccesstokenHandler,
  verifyEmailOtpHandler,
} from "../controllers/auth.controller";

const router = Router();

router.post(
  "/email/initiate",
  validateRequest(initiateEmailOtpSchema),
  initiateEmailOtpHandler
);

router.post(
  "/email/verify",
  validateRequest(verifyEmailOtpSchema),
  verifyEmailOtpHandler
);

router.post(
  "/refresh-token",
  validateRequest(refreshTokenSchema),
  refreshAccesstokenHandler
);

export { router as authRouter };
