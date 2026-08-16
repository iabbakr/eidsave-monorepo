import { z } from "zod";

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).max(15).optional(),
  address: z.object({
    state: z.string().min(1),
    city: z.string().min(1),
    town: z.string().optional(),
    street: z.string().min(1),
  }).optional(),
  nextOfKin: z.object({
    name: z.string().min(1),
    phone: z.string().min(10).max(15),
    relationship: z.string().min(1),
  }).optional(),
});

export const PushTokenSchema = z.object({
  token: z.string().min(1, "Token required"),
});

export type UpdateProfileBody = z.infer<typeof UpdateProfileSchema>;
export type PushTokenBody = z.infer<typeof PushTokenSchema>;
