import { Request, Response } from "express";
import crypto from "crypto";
import { UserRepository } from "../repositories/user.repository.js";
import { WalletService } from "../services/wallet.service.js";
import { logger } from "../lib/logger.js";

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Xpress callback. We do NOT trust the payload for amounts or balances:
 * it is only used to work out WHICH customer to re-sync. The credit itself is
 * always read back from Xpress's API and written idempotently, so a forged or
 * replayed callback can at worst trigger a harmless re-sync.
 *
 * Auth: a secret token in the callback URL you register with Xpress
 *   https://<host>/api/v1/webhooks/xpress?token=<XPRESS_WEBHOOK_TOKEN>
 */
export const WebhookController = {
  async xpress(req: Request, res: Response): Promise<void> {
    const expected = process.env["XPRESS_WEBHOOK_TOKEN"] ?? "";
    const provided = typeof req.query["token"] === "string" ? (req.query["token"] as string) : "";
    if (!expected || !safeEqual(provided, expected)) {
      res.status(401).json({ message: "Unauthorized", success: false });
      return;
    }

    try {
      const b: any = req.body ?? {};
      const d: any = b.data ?? {};
      const customerId = b.customerId ?? b.customer_id ?? d.customerId ?? d.customer_id ?? b.customer?.id ?? d.customer?.id;
      const accountNumber = b.accountNumber ?? b.account_number ?? d.accountNumber ?? d.account_number;

      const user =
        (customerId && (await UserRepository.findByXpressCustomerId(String(customerId)))) ||
        (accountNumber && (await UserRepository.findByVirtualAccount(String(accountNumber)))) ||
        null;

      if (!user) {
        // Shape unknown / not ours: the reconcile job will still pick the credit up.
        logger.warn(
          process.env["NODE_ENV"] === "production" ? { keys: Object.keys(b) } : { body: b },
          "Xpress webhook received but no matching user found",
        );
        res.status(200).json({ message: "Received", success: true });
        return;
      }

      await WalletService.syncDeposits(user.id);
      res.status(200).json({ message: "Webhook processed successfully", success: true });
    } catch (err) {
      logger.error({ err }, "Xpress webhook processing failed");
      res.status(500).json({ message: "Internal server error", success: false });
    }
  },
};