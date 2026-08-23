import { Response, NextFunction, Request } from "express";
import { OtpService } from "../services/otp.service.js";
import type { SendOtpBody, VerifyOtpBody } from "../schema/otp.schema.js";

export const OtpController = {
  async sendVerification(req: Request & { body: SendOtpBody }, res: Response, next: NextFunction) {
    try {
      const result = await OtpService.sendVerification(req.body.email.trim().toLowerCase());
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request & { body: VerifyOtpBody }, res: Response, next: NextFunction) {
    try {
      const result = await OtpService.verify(req.body.email.trim().toLowerCase(), req.body.code);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
