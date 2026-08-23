import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { SupportService } from "../services/support.service.js";
import { createError } from "../middlewares/error.js";

export const SupportController = {
  async createTicket(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) throw createError("Unauthorized", 401);
    const ticket = await SupportService.createTicket(req.userId, req.body);
    res.status(201).json(ticket);
  },

  async getMyTickets(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) throw createError("Unauthorized", 401);
    const tickets = await SupportService.getUserTickets(req.userId);
    res.json(tickets);
  },
};