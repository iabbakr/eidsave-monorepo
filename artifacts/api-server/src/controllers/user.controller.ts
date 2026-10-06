import { Response, NextFunction } from "express";
import { UserService } from "../services/user.service.js";
import { uploadMedia } from "../lib/cloudinary.js";
import { createError } from "../middlewares/error.js";
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

  async uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw createError("No image file uploaded", 400);

      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const result = await uploadMedia(dataUri, "avatars");
      const profile = await UserService.uploadAvatar(req.userId!, result.secure_url);
      res.json(profile);
    } catch (err) { next(err); }
  },

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await UserService.deleteAccount(req.userId!);
      res.json(result);
    } catch (err) { next(err); }
  },
};