import { z } from "zod";

export const KycVerifySchema = z.object({
  bvn: z.string().regex(/^\d{11}$/, "BVN must be 11 digits"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
});

export type KycVerifyBody = z.infer<typeof KycVerifySchema>;