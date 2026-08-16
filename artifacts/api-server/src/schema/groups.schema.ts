import { z } from "zod";

export const CreateGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters").max(80),
  description: z.string().max(300).optional(),
  memberLimit: z.number({ invalid_type_error: "Member limit must be a number" })
    .int()
    .min(2, "At least 2 members")
    .max(100),
  animalId: z.string().uuid("Invalid animal ID").optional(),
  targetAmount: z.number().positive().optional(),
});

export const ContributeSchema = z.object({
  amount: z.number({ invalid_type_error: "Amount must be a number" })
    .min(500, "Minimum contribution is ₦500"),
});

export type CreateGroupBody = z.infer<typeof CreateGroupSchema>;
export type ContributeBody = z.infer<typeof ContributeSchema>;
