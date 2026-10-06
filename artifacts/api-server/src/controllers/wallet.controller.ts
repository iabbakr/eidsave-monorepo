import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { WalletService } from "../services/wallet.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { EmailService } from "../services/emailService.js";
import { XpressService, toHttpError, FEE_SCHEDULE } from "../services/xpress.service.js";
import { createError } from "../middlewares/error.js";
import { computeEidWindow } from "../services/eidCalendar.service.js";

function walletType(req: AuthRequest): "adha" | "fitr" {
  const type = req.params["type"] as "adha" | "fitr";
  if (!["adha", "fitr"].includes(type)) throw createError("Invalid wallet type", 400);
  return type;
}

export const WalletController = {
  async getWallet(req: AuthRequest, res: Response): Promise<void> {
    res.json(await WalletService.getWallet(req.userId!, walletType(req)));
  },

  async getDepositAccount(req: AuthRequest, res: Response): Promise<void> {
    res.json(await WalletService.getDepositAccount(req.userId!, walletType(req)));
  },

  async syncDeposits(req: AuthRequest, res: Response): Promise<void> {
    walletType(req);
    res.json(await WalletService.syncDeposits(req.userId!));
  },

  async withdraw(req: AuthRequest, res: Response): Promise<void> {
    const type = walletType(req);

    // Enforce 1 month before / 1 week after window
    const windowInfo = computeEidWindow(type, new Date());
    if (!windowInfo.isWithdrawalOpen) {
      throw createError(
        `Withdrawals for ${type === "adha" ? "Eid al-Adha" : "Eid al-Fitr"} are closed. The withdrawal window opens on ${windowInfo.withdrawalOpensAt} (1 month before Eid) and closes on ${windowInfo.withdrawalClosesAt} (1 week after Eid).`,
        403
      );
    }

    const tx = await WalletService.withdraw(req.userId!, type, req.body);

    if (tx.status === "success") {
      const user = await UserRepository.findById(req.userId!);
      if (user) {
        await EmailService.sendReceipt({
          toEmail: user.email,
          customerName: user.name,
          type: "withdrawal",
          amount: tx.amount,
          walletType: type,
          reference: tx.reference,
          date: new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        });
      }
    }
    res.json(tx);
  },

  async getTransactions(req: AuthRequest, res: Response): Promise<void> {
    const type = walletType(req);
    const page = parseInt((req.query["page"] as string) || "1", 10);
    const limit = parseInt((req.query["limit"] as string) || "20", 10);
    res.json(await WalletService.getTransactions(req.userId!, type, page, limit));
  },

  async banks(_req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json({ banks: await XpressService.listBanks(), feeSchedule: FEE_SCHEDULE });
    } catch (err) {
      throw toHttpError(err, "Couldn't load banks right now");
    }
  },

  async resolveAccount(req: AuthRequest, res: Response): Promise<void> {
    const bankCode = String(req.query["bankCode"] ?? "");
    const accountNumber = String(req.query["accountNumber"] ?? "");
    if (!/^\d{3,6}$/.test(bankCode) \vert{}\vert{} !/^\d{10}$/.test(accountNumber)) {
      throw createError("Enter a valid bank and 10-digit account number", 400);
    }
    try {
      const account = await XpressService.resolveAccount(bankCode, accountNumber);
      res.json({ accountName: account.accountName });
    } catch (err) {
      throw toHttpError(err, "Couldn't verify that account right now");
    }
  },
};