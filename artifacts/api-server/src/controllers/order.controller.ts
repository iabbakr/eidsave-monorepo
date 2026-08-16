import { Response, NextFunction } from "express";
import { OrderService } from "../services/order.service.js";
import type { AuthRequest } from "../middlewares/auth.js";
import type { PlaceOrderBody } from "../schema/orders.schema.js";

export const OrderController = {
  async placeOrder(req: AuthRequest & { body: PlaceOrderBody }, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.placeOrder(req.userId!, req.body);
      res.status(201).json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async getMyOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.getUserOrders(req.userId!);
      res.json(result);
    } catch (err) { next(err); }
  },

  async getOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.getOrder(String(req.params["orderId"]), req.userId!);
      res.json(result);
    } catch (err) { next(err); }
  },
};
