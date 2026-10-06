import { Response, NextFunction } from "express";
import { KycService } from "../services/kyc.service.js";
import type { AuthRequest } from "../middlewares/auth.js";

export const KycController = {
  async status(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await KycService.getStatus(req.userId!)); } catch (err) { next(err); }
  },
  async verify(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await KycService.verify(req.userId!, req.body)); } catch (err) { next(err); }
  },
};