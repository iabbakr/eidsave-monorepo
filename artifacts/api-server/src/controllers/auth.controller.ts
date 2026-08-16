import { Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import type { AuthRequest } from "../middlewares/auth.js";
import type { RegisterBody, LoginBody, SetPinBody, VerifyPinBody } from "../schema/auth.schema.js";

export const AuthController = {
  async register(req: AuthRequest & { body: RegisterBody }, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async login(req: AuthRequest & { body: LoginBody }, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async setPin(req: AuthRequest & { body: SetPinBody }, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.setPin(req.userId!, req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async verifyPin(req: AuthRequest & { body: VerifyPinBody }, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.verifyPin(req.userId!, req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },
};
