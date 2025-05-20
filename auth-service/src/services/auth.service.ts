import { env } from "../config";
import { redisClient } from "../config/redisClient";
import { InitiateEmailOtpInput } from "../schemas/auth.schema";
import { logger } from "../utils/logger";

export const initiateEmailOtp = async (
  input: InitiateEmailOtpInput
): Promise<{ message: string; otp_for_testing?: string }> => {
  const { email } = input;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  logger.debug(`OTP for ${email}: ${otp}`);

  const otpKey = `${env.OTP_REDIS_PREFIX}${email}`;
  try {
    await redisClient.set(otpKey, otp, "EX", env.OTP_EXPIRY_SECONDS);

    logger.info(
      `OTP for ${email} stored in Redis, Key: ${otpKey}, Expires in: ${env.OTP_EXPIRY_SECONDS}s`
    );
  } catch (error) {
    logger.error(`Error storing OTP in Redis for enail ${email}: `, error);

    throw error;
  }

  // TODO: send OTP via email
  logger.info(`(Placeholder) Email would be sent to ${email} with OTP: ${otp}`);

  const response: { message: string; otp_for_testing?: string } = {
    message: "OTP initiiation process started. Check your email.",
  };

  if (env.NODE_ENV === "development") {
    response.otp_for_testing = otp;
  }

  return response;
};
