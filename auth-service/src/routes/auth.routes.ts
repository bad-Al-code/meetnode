import { Router } from "express";

import { validateRequest } from "../middlewares/validateRequest.middleware";
import {
  initiateEmailOtpSchema,
  verifyEmailOtpSchema,
} from "../schemas/auth.schema";
import {
  initiateEmailOtpHandler,
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

export { router as authRouter };
