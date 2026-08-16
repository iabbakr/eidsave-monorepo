import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { WalletRepository } from "../repositories/wallet.repository.js";
import { logger } from "../lib/logger.js";

export const WebhookController = {
  async paystack(req: Request, res: Response, next: NextFunction) {
    try {
      const secret = process.env["PAYSTACK_SECRET_KEY"] ?? "";
      const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");
      const signature = req.headers["x-paystack-signature"] as string;

      if (secret && hash !== signature) {
        logger.warn("Invalid Paystack signature");
        res.status(401).json({ message: "Invalid signature", success: false });
        return;
      }

      const event = req.body as { event: string; data: { reference: string; amount: number } };

      if (event.event === "charge.success") {
        const { reference } = event.data;
        const amount = event.data.amount / 100;

        const tx = await TransactionRepository.findByReference(reference);
        if (tx && tx.status === "pending") {
          await TransactionRepository.updateStatus(reference, "success");

          const wallet = await WalletRepository.findByUserAndType(tx.userId, tx.walletType as "adha" | "fitr");
          if (wallet) {
            const newBalance = (parseFloat(wallet.balance as string) + amount).toFixed(2);
            await WalletRepository.updateBalance(wallet.id, newBalance, tx.userId, tx.walletType);
          }
        }
      }

      res.json({ message: "Webhook processed", success: true });
    } catch (err) { next(err); }
  },
};
