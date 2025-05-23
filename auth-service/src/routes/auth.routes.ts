import { Router } from "express";

import { validateRequest } from "../middlewares/validateRequest.middleware";
import {
  initiateEmailOtpSchema,
  refreshTokenSchema,
  verifyEmailOtpSchema,
} from "../schemas/auth.schema";
import {
  googleOAuthCallbackHandler,
  initiateEmailOtpHandler,
  logoutHandler,
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

router.get("/google/callback", googleOAuthCallbackHandler);

router.post("/logout", validateRequest(refreshTokenSchema), logoutHandler);

export { router as authRouter };
