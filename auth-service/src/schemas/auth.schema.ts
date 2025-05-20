import { z } from "zod";

export const initiateEmailOtpSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email address" }),
  }),
});

export type InitiateEmailOtpInput = z.infer<
  typeof initiateEmailOtpSchema
>["body"];
