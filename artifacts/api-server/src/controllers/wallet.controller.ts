import { Response, NextFunction } from "express";
import { WalletService } from "../services/wallet.service.js";
import { createError } from "../middlewares/error.js";
import type { AuthRequest } from "../middlewares/auth.js";
import type { DepositInitBody, DepositVerifyBody, WithdrawBody } from "../schema/wallet.schema.js";

function getType(req: AuthRequest): "adha" | "fitr" {
  const t = String(req.params["type"]);
  if (t !== "adha" && t !== "fitr") throw createError("Invalid wallet type", 400);
  return t;
}

export const WalletController = {
  async getWallet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await WalletService.getWallet(req.userId!, getType(req));
      res.json(result);
    } catch (err) { next(err); }
  },

  async initDeposit(req: AuthRequest & { body: DepositInitBody }, res: Response, next: NextFunction) {
    try {
      const result = await WalletService.initDeposit(req.userId!, getType(req), req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async verifyDeposit(req: AuthRequest & { body: DepositVerifyBody }, res: Response, next: NextFunction) {
    try {
      const result = await WalletService.verifyDeposit(req.userId!, getType(req), req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async withdraw(req: AuthRequest & { body: WithdrawBody }, res: Response, next: NextFunction) {
    try {
      const result = await WalletService.withdraw(req.userId!, getType(req), req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(String(req.query["page"] ?? "1")));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query["limit"] ?? "20"))));
      const result = await WalletService.getTransactions(req.userId!, getType(req), page, limit);
      res.json(result);
    } catch (err) { next(err); }
  },
};
