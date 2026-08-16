import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number").max(15),
  password: z.string().min(8, "Password must be at least 8 characters"),
  address: z.object({
    state: z.string().min(1, "State required"),
    city: z.string().min(1, "City required"),
    town: z.string().optional(),
    street: z.string().min(1, "Street required"),
  }),
  nextOfKin: z.object({
    name: z.string().min(1),
    phone: z.string().min(10).max(15),
    relationship: z.string().min(1),
  }).optional(),
  referredBy: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export const SetPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
});

export const VerifyPinSchema = z.object({
  pin: z.string().min(1, "PIN required"),
});

export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;
export type SetPinBody = z.infer<typeof SetPinSchema>;
export type VerifyPinBody = z.infer<typeof VerifyPinSchema>;
