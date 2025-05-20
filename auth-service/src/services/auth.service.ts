import { InitiateEmailOtpInput } from "../schemas/auth.schema";
import { logger } from "../utils/logger";

export const initiateEmailOtp = async (
  input: InitiateEmailOtpInput
): Promise<{ message: string; otp?: string }> => {
  const { email } = input;

  // TODO: check if user exists

  const otp = Math.floor(100000 + Math.random() + 900000).toString();
  logger.debug(`OTP for ${email}: ${otp}`);

  // TODO: store otp (redis with expiry)
  // TODO: send OTP via email

  return {
    message: "OTP initiiation process started. Check your email.",
    otp: otp,
  };
};
