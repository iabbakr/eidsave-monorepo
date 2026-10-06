import { UserRepository } from "../repositories/user.repository.js";
import { WalletService } from "../services/wallet.service.js";
import { withLock } from "../lib/idempotencyLock.js";
import { logger } from "../lib/logger.js";

/**
 * Safety net for missed/unrecognised webhooks. Sequential on purpose (gentle on the provider).
 * Fine for a few hundred verified users; past that, restrict it to recently active users.
 */
export async function runDepositReconcileJob(): Promise<void> {
  try {
    await withLock("job:deposit-reconcile", async () => {
      const users = await UserRepository.findKycVerified(500);
      let credited = 0;
      for (const u of users) {
        try {
          const r = await WalletService.syncDeposits(u.id);
          credited += r.credited.length;
        } catch (err) {
          logger.warn({ err, userId: u.id }, "Deposit reconcile failed for user");
        }
      }
      if (credited > 0) logger.info({ credited, users: users.length }, "Deposit reconcile credited missed deposits");
    }, 540);
  } catch (err) {
    logger.error({ err }, "Deposit reconcile job failed");
  }
}