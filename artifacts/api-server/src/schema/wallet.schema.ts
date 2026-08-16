import { z } from "zod";

export const WalletTypeParam = z.enum(["adha", "fitr"]);

export const DepositInitSchema = z.object({
  amount: z.number({ invalid_type_error: "Amount must be a number" })
    .min(500, "Minimum deposit is ₦500")
    .max(500000, "Maximum deposit is ₦500,000"),
});

export const DepositVerifySchema = z.object({
  reference: z.string().min(1, "Reference required"),
});

export const WithdrawSchema = z.object({
  amount: z.number({ invalid_type_error: "Amount must be a number" })
    .min(100, "Minimum withdrawal is ₦100"),
});

export const SetTargetSchema = z.object({
  targetAmount: z.number().positive("Target must be positive"),
});

export type DepositInitBody = z.infer<typeof DepositInitSchema>;
export type DepositVerifyBody = z.infer<typeof DepositVerifySchema>;
export type WithdrawBody = z.infer<typeof WithdrawSchema>;
