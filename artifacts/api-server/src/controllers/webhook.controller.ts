import { Request, Response } from "express";
import crypto from "crypto";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { WalletRepository } from "../repositories/wallet.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { EmailService } from "../services/emailService.js";
import { logger } from "../lib/logger.js";

export const WebhookController = {
  async paystack(req: Request, res: Response): Promise<void> {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY || "";
      const hash = crypto
        .createHmac("sha512", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        res.status(400).json({ message: "Invalid signature", success: false });
        return;
      }

      const event = req.body;
      if (event.event === "charge.success") {
        const { reference, amount, customer } = event.data;
        const nairaAmount = amount / 100;

        const tx = await TransactionRepository.findByReference(reference);
        if (tx && tx.status !== "success") {
          await TransactionRepository.updateStatus(reference, "success");

          const wallet = await WalletRepository.findByUserAndType(
            tx.userId,
            tx.walletType as "adha" | "fitr"
          );

          if (wallet) {
            const currentBal = parseFloat(wallet.balance as string);
            const newBal = (currentBal + nairaAmount).toFixed(2);
            await WalletRepository.updateBalance(
              wallet.id,
              newBal,
              tx.userId,
              tx.walletType
            );
          }

          const user = await UserRepository.findById(tx.userId);
          if (user) {
            await EmailService.sendReceipt({
              toEmail: user.email,
              customerName: user.name,
              type: "deposit",
              amount: nairaAmount,
              walletType: tx.walletType as "adha" | "fitr",
              reference,
              date: new Date().toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            });
          }
        }
      }

      res.status(200).json({ message: "Webhook processed successfully", success: true });
    } catch (err) {
      logger.error({ err }, "Paystack webhook processing failed");
      res.status(500).json({ message: "Internal server error", success: false });
    }
  },
};