import { Router } from "express";
import { validateRequest } from "../middlewares/validateRequest.middleware";
import { initiateEmailOtpSchema } from "../schemas/auth.schema";
import { initiateEmailOtpHandler } from "../controllers/auth.controller";

const router = Router();

router.post(
  "/email/initiate",
  validateRequest(initiateEmailOtpSchema),
  initiateEmailOtpHandler
);

export { router as authRouter };
