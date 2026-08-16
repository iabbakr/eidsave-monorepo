import { Response, NextFunction } from "express";
import { UserService } from "../services/user.service.js";
import type { AuthRequest } from "../middlewares/auth.js";
import type { UpdateProfileBody, PushTokenBody } from "../schema/user.schema.js";

export const UserController = {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await UserService.getProfile(req.userId!);
      res.json(result);
    } catch (err) { next(err); }
  },

  async updateProfile(req: AuthRequest & { body: UpdateProfileBody }, res: Response, next: NextFunction) {
    try {
      const result = await UserService.updateProfile(req.userId!, req.body);
      res.json(result);
    } catch (err) { next(err); }
  },

  async savePushToken(req: AuthRequest & { body: PushTokenBody }, res: Response, next: NextFunction) {
    try {
      const result = await UserService.savePushToken(req.userId!, req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },
};
