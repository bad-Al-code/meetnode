import { z } from "zod";

export const initiateEmailOtpSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email address" }),
  }),
});

export type InitiateEmailOtpInput = z.infer<
  typeof initiateEmailOtpSchema
>["body"];

export const verifyEmailOtpSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email address" }),
    otp: z
      .string()
      .length(6, { message: "OTP must be 6 digits" })
      .regex(/^\d+$/, { message: "OTP must be numberic" }),
  }),
});

export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>["body"];
