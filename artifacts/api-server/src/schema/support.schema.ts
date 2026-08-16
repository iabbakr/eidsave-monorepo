import { z } from "zod";

export const CreateTicketSchema = z.object({
  category: z.enum(["deposit", "delivery", "wrong_info", "account", "other"]),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message too long (max 1000 characters)"),
  photos: z.array(z.string().url()).optional(),
});

export type CreateTicketBody = z.infer<typeof CreateTicketSchema>;
