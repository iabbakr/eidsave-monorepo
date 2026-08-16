import { Response, NextFunction } from "express";
import { AdminService } from "../services/admin.service.js";
import type { AuthRequest } from "../middlewares/auth.js";

export const AdminController = {
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getStats();
      res.json(result);
    } catch (err) { next(err); }
  },

  async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { q, state, page } = req.query as { q?: string; state?: string; page?: string };
      const result = await AdminService.listUsers(q, state, parseInt(page ?? "1"));
      res.json(result);
    } catch (err) { next(err); }
  },

  async getAllOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, eidType } = req.query as { status?: string; eidType?: string };
      const result = await AdminService.getAllOrders({ status, eidType });
      res.json(result);
    } catch (err) { next(err); }
  },

  async updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.updateOrderStatus(String(req.params["id"]), req.body.status);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async createAnimal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.createAnimal(req.body);
      res.status(201).json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async updateAnimal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.updateAnimal(String(req.params["id"]), req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },
};
