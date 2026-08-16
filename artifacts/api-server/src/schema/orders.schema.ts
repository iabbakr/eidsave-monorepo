import { z } from "zod";

const RecipientSchema = z.object({
  name: z.string().min(1, "Recipient name required"),
  phone: z.string().min(10).max(15),
  address: z.object({
    state: z.string().min(1),
    city: z.string().min(1),
    town: z.string().optional(),
    street: z.string().min(1),
  }),
});

export const PlaceOrderSchema = z.object({
  animalId: z.string().uuid("Invalid animal ID"),
  size: z.string().min(1, "Size required"),
  quantity: z.number({ invalid_type_error: "Quantity must be a number" })
    .int()
    .min(1, "Quantity must be at least 1")
    .max(10),
  eidType: z.enum(["adha", "fitr"]),
  recipients: z.array(RecipientSchema).min(1, "At least one recipient required"),
});

export type PlaceOrderBody = z.infer<typeof PlaceOrderSchema>;
