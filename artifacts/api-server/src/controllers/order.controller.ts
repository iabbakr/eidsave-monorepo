import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { OrderService } from "../services/order.service.js";
import { createError } from "../middlewares/error.js";

export const OrderController = {
  async placeOrder(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) throw createError("Unauthorized", 401);
    const order = await OrderService.placeOrder(req.userId, req.body);
    res.status(201).json(order);
  },

  async getMyOrders(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) throw createError("Unauthorized", 401);
    const orders = await OrderService.getUserOrders(req.userId);
    res.json(orders);
  },

  async getOrder(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) throw createError("Unauthorized", 401);
    const orderId = String(req.params["orderId"] ?? "");
    if (!orderId) throw createError("Order ID required", 400);

    const order = await OrderService.getOrder(orderId, req.userId);
    res.json(order);
  },
};