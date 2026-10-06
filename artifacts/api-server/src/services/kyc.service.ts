import { UserRepository } from "../repositories/user.repository.js";
import { XpressService, toHttpError } from "./xpress.service.js";
import { withLock } from "../lib/idempotencyLock.js";
import { createError } from "../middlewares/error.js";
import { logger } from "../lib/logger.js";
import { limitsFor } from "../lib/kycTiers.js";
import type { KycVerifyBody } from "../schema/kyc.schema.js";

type UserRow = NonNullable<Awaited<ReturnType<typeof UserRepository.findById>>>;

function ageOn(dob: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

function toStatus(user: UserRow) {
  const verified = user.kycStatus === "verified" && !!user.virtualAccountNumber;
  return {
    status: (verified ? "verified" : "none") as "none" | "verified",
    verified,
    tier: verified ? (user.kycTier ?? "TIER_1") : null,
    limits: verified ? limitsFor(user.kycTier) : null,
    account: verified
      ? {
          bankName: user.virtualBankName ?? "Providus Bank",
          accountNumber: user.virtualAccountNumber!,
          accountName: user.virtualAccountName ?? user.name,
        }
      : null,
  };
}

export const KycService = {
  async getStatus(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw createError("User not found", 404);
    return toStatus(user);
  },

  async verify(userId: string, body: KycVerifyBody) {
    const user = await UserRepository.findById(userId);
    if (!user) throw createError("User not found", 404);
    if (user.kycStatus === "verified" && user.virtualAccountNumber) {
      return toStatus(user);
    }

    const dob = new Date(`${body.dateOfBirth}T00:00:00Z`);
    if (Number.isNaN(dob.getTime())) throw createError("Invalid date of birth", 400);
    if (ageOn(dob) < 18) throw createError("You must be 18 or older to open a wallet", 400);

    const address =
      [user.address, user.area, user.city, user.state].filter(Boolean).join(", ") || "Nigeria";

    const updated = await withLock(
      `kyc:${userId}`,
      async () => {
        await UserRepository.invalidate(userId);
        const fresh = await UserRepository.findById(userId);
        if (fresh?.kycStatus === "verified" && fresh.virtualAccountNumber) {
          return fresh;
        }

        let created;
        try {
          created = await XpressService.createCustomerWallet({
            bvn: body.bvn,
            firstName: body.firstName.trim(),
            lastName: body.lastName.trim(),
            dateOfBirth: body.dateOfBirth,
            phoneNumber: user.phone,
            email: user.email,
            address,
            metadata: { eidsaveUserId: userId },
          });
        } catch (err) {
          throw toHttpError(err, "Identity verification is temporarily unavailable. Please try again shortly.");
        }

        const customer = (created as any).customer ?? (created as any).data?.customer;
        const wallet = (created as any).wallet ?? (created as any).data?.wallet;

        if (!wallet?.accountNumber) {
          logger.error({ created, userId }, "Xpress succeeded but wallet payload is missing");
          throw createError("Wallet provider did not return an account number", 502);
        }

        try {
          const saved = await UserRepository.update(userId, {
            dateOfBirth: body.dateOfBirth,
            bvnLast4: body.bvn.slice(-4),
            kycStatus: "verified",
            kycTier: customer?.tier ?? "TIER_1",
            kycNameMatch: customer?.nameMatch ?? null,
            xpressCustomerId: customer?.id ?? null,
            virtualAccountNumber: wallet.accountNumber,
            virtualBankName: wallet.bankName ?? "Providus Bank",
            virtualAccountName: wallet.accountName ?? `${body.firstName} ${body.lastName}`,
          });
          if (!saved) throw new Error("User row vanished during update");
          return saved;
        } catch (err) {
          logger.error(
            { err, userId, xpressCustomerId: customer?.id },
            "Xpress wallet created but local database update failed",
          );
          throw createError("Account created with provider, but finalizing profile failed. Please contact support.", 500);
        }
      },
      60,
    );

    if (!updated) throw createError("Verification is already in progress", 409);
    return toStatus(updated);
  },
};