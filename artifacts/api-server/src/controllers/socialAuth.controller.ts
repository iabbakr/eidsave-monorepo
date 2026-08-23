import { Response, NextFunction, Request } from "express";
import { SocialAuthService } from "../services/socialAuth.service.js";
import type { SocialAuthBody } from "../schema/socialAuth.schema.js";

export const SocialAuthController = {
  async authenticate(req: Request & { body: SocialAuthBody }, res: Response, next: NextFunction) {
    try {
      const result = await SocialAuthService.authenticate(req.body);
      res.json({ ...result, success: true });
    } catch (err) {
      next(err);
    }
  },
};
