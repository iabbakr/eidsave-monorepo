import { z } from "zod";

export const SendOtpSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email("Invalid email"),
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

export type SendOtpBody = z.infer<typeof SendOtpSchema>;
export type VerifyOtpBody = z.infer<typeof VerifyOtpSchema>;
