import { z } from "zod";

export const SocialAuthSchema = z.object({
  provider: z.enum(["google", "apple"]),
  // ID token issued by Google/Apple on the client. Verified server-side
  // (see socialAuth.service.ts) before we ever trust the email it carries.
  idToken: z.string().min(10, "Missing provider token"),
  // Apple only sends name on the very first sign-in — client forwards it
  // through here since it can't be recovered later from the token alone.
  name: z.string().optional(),
});

export type SocialAuthBody = z.infer<typeof SocialAuthSchema>;
