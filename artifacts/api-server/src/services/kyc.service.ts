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
    if (user.kycStatus === "verified") return toStatus(user);

    const dob = new Date(`${body.dateOfBirth}T00:00:00Z`);
    if (Number.isNaN(dob.getTime())) throw createError("Invalid date of birth", 400);
    if (ageOn(dob) < 18) throw createError("You must be 18 or older to open a wallet", 400);

    const address =
      [user.address, user.area, user.city, user.state].filter(Boolean).join(", ") || "Nigeria";

    // Each attempt costs the merchant wallet (BVN check + wallet reservation), so serialize per user.
    const updated = await withLock(
      `kyc:${userId}`,
      async () => {
        await UserRepository.invalidate(userId);
        const fresh = await UserRepository.findById(userId);
        if (fresh?.kycStatus === "verified") return fresh;

        let created;
        try {
          created = await XpressService.createCustomerWallet({
            bvn: body.bvn,
            firstName: body.firstName,
            lastName: body.lastName,
            dateOfBirth: body.dateOfBirth,
            phoneNumber: user.phone,
            email: user.email,
            address,
            metadata: { eidsaveUserId: userId },
          });
        } catch (err) {
          throw toHttpError(err, "Identity verification is temporarily unavailable. Please try again shortly.");
        }

        try {
          const saved = await UserRepository.update(userId, {
            dateOfBirth: body.dateOfBirth,
            bvnLast4: body.bvn.slice(-4),
            kycStatus: "verified",
            kycTier: created.customer.tier ?? "TIER_1",
            kycNameMatch: created.customer.nameMatch ?? null,
            xpressCustomerId: created.customer.id,
            virtualAccountNumber: created.wallet.accountNumber,
            virtualBankName: created.wallet.bankName,
            virtualAccountName: created.wallet.accountName,
          });
          if (!saved) throw new Error("user row vanished");
          return saved;
        } catch (err) {
          logger.error(
            { err, userId, xpressCustomerId: created.customer.id },
            "Xpress wallet created but saving it failed - needs manual reconciliation",
          );
          throw createError("We couldn't finish setting up your account. Please contact support.", 500);
        }
      },
      60,
    );

    if (!updated) throw createError("Verification is already in progress", 409);
    return toStatus(updated);
  },
};