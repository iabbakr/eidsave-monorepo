import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { AdminService } from "../services/admin.service.js";
import { runPushDispatchJob } from "../jobs/notificationDispatch.job.js";
import { cacheDelPattern } from "../lib/cache.js";
import { uploadMedia } from "../lib/cloudinary.js";
import { createError } from "../middlewares/error.js";

export const AdminController = {
  async getStats(_req: AuthRequest, res: Response): Promise<void> {
    const stats = await AdminService.getStats();
    res.json(stats);
  },

  async listUsers(req: AuthRequest, res: Response): Promise<void> {
    const q = req.query["q"] as string | undefined;
    const state = req.query["state"] as string | undefined;
    const page = parseInt((req.query["page"] as string) || "1", 10);

    const users = await AdminService.listUsers(q, state, page);
    res.json(users);
  },

  async getAllOrders(req: AuthRequest, res: Response): Promise<void> {
    const status = req.query["status"] as string | undefined;
    const eidType = req.query["eidType"] as string | undefined;

    const orders = await AdminService.getAllOrders({ status, eidType });
    res.json(orders);
  },

  async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params["id"] ?? "");
    const { status } = req.body;
    if (!id || !status) throw createError("Missing order ID or status", 400);

    const updated = await AdminService.updateOrderStatus(id, status);
    res.json(updated);
  },

  async createAnimal(req: AuthRequest, res: Response): Promise<void> {
    const animal = await AdminService.createAnimal(req.body);
    res.status(201).json(animal);
  },

  async updateAnimal(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params["id"] ?? "");
    if (!id) throw createError("Animal ID required", 400);

    const updated = await AdminService.updateAnimal(id, req.body);
    res.json(updated);
  },

  async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params["id"] ?? "");
    const { isActive } = req.body;
    if (!id || typeof isActive !== "boolean") {
      throw createError("User ID and isActive flag are required", 400);
    }

    const result = await AdminService.updateUserStatus(id, isActive);
    res.json(result);
  },

  async getEarnings(req: AuthRequest, res: Response): Promise<void> {
    const period = (req.query["period"] as "week" | "month" | "year") || "month";
    const earnings = await AdminService.getEarnings(period);
    res.json(earnings);
  },

  async getAllTickets(req: AuthRequest, res: Response): Promise<void> {
    const status = req.query["status"] as string | undefined;
    const page = parseInt((req.query["page"] as string) || "1", 10);
    const tickets = await AdminService.getAllTickets({ status, page });
    res.json(tickets);
  },

  async updateTicketStatus(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params["id"] ?? "");
    const { status, reply } = req.body;
    if (!id || !status) throw createError("Ticket ID and status are required", 400);

    const updated = await AdminService.updateTicketStatus(id, status, reply);
    res.json(updated);
  },

  async broadcastNotification(req: AuthRequest, res: Response): Promise<void> {
    const { title, message, targetAudience } = req.body;
    if (!title || !message) throw createError("Title and message are required", 400);

    const result = await runPushDispatchJob({
      title,
      body: message,
      data: { targetAudience: targetAudience || "all" },
    });

    res.json({
      message: `Broadcast dispatched to ${result.sent} devices`,
      sent: result.sent,
      failed: result.failed,
    });
  },

  async flushCache(_req: AuthRequest, res: Response): Promise<void> {
    await cacheDelPattern("eidsave:*");
    res.json({ message: "Platform cache flushed successfully", success: true });
  },

  async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    const file = req.file;
    if (!file) throw createError("No image file uploaded", 400);

    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const result = await uploadMedia(dataUri, "animals");
    res.json({ url: result.secure_url, publicId: result.public_id });
  },
};