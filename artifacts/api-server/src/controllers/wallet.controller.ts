import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { WalletService } from "../services/wallet.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { EmailService } from "../services/emailService.js";
import { createError } from "../middlewares/error.js";

export const WalletController = {
  async getWallet(req: AuthRequest, res: Response): Promise<void> {
    const type = req.params["type"] as "adha" | "fitr";
    if (!["adha", "fitr"].includes(type)) throw createError("Invalid wallet type", 400);

    const wallet = await WalletService.getWallet(req.userId!, type);
    res.json(wallet);
  },

  async initDeposit(req: AuthRequest, res: Response): Promise<void> {
    const type = req.params["type"] as "adha" | "fitr";
    if (!["adha", "fitr"].includes(type)) throw createError("Invalid wallet type", 400);

    const result = await WalletService.initDeposit(req.userId!, type, req.body);
    res.json(result);
  },

  async verifyDeposit(req: AuthRequest, res: Response): Promise<void> {
    const type = req.params["type"] as "adha" | "fitr";
    if (!["adha", "fitr"].includes(type)) throw createError("Invalid wallet type", 400);

    const tx = await WalletService.verifyDeposit(req.userId!, type, req.body);

    const user = await UserRepository.findById(req.userId!);
    if (user) {
      await EmailService.sendReceipt({
        toEmail: user.email,
        customerName: user.name,
        type: "deposit",
        amount: tx.amount,
        walletType: type,
        reference: tx.reference,
        date: new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      });
    }

    res.json(tx);
  },

  async withdraw(req: AuthRequest, res: Response): Promise<void> {
    const type = req.params["type"] as "adha" | "fitr";
    if (!["adha", "fitr"].includes(type)) throw createError("Invalid wallet type", 400);

    const tx = await WalletService.withdraw(req.userId!, type, req.body);

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

    res.json(tx);
  },

  async getTransactions(req: AuthRequest, res: Response): Promise<void> {
    const type = req.params["type"] as "adha" | "fitr";
    const page = parseInt((req.query["page"] as string) || "1", 10);
    const limit = parseInt((req.query["limit"] as string) || "20", 10);

    const result = await WalletService.getTransactions(req.userId!, type, page, limit);
    res.json(result);
  },
};