import { z } from "zod";

// ── Address ──────────────────────────────────────────────────────────────
// state + city + area come from the cascading location filter (populated
// from GET /locations/config, which is already fed by NIGERIAN_LOCATIONS).
// `address` is the free-text street/house address line, left for the user
// to type in themselves — it is intentionally NOT part of the filter.
export const AddressSchema = z.object({
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  area: z.string().min(1, "Area is required"),
  address: z.string().min(3, "Address is required"),
});

export const RegisterSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Invalid phone number").max(15),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
    address: AddressSchema,
    nextOfKin: z
      .object({
        name: z.string().min(1),
        phone: z.string().min(10).max(15),
        relationship: z.string().min(1),
      })
      .optional(),
    referredBy: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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
