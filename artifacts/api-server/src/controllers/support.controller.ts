import { Response, NextFunction } from "express";
import { SupportService } from "../services/support.service.js";
import type { AuthRequest } from "../middlewares/auth.js";
import type { CreateTicketBody } from "../schema/support.schema.js";

export const SupportController = {
  async createTicket(req: AuthRequest & { body: CreateTicketBody }, res: Response, next: NextFunction) {
    try {
      const result = await SupportService.createTicket(req.userId!, req.body);
      res.status(201).json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async getMyTickets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await SupportService.getUserTickets(req.userId!);
      res.json(result);
    } catch (err) { next(err); }
  },
};
