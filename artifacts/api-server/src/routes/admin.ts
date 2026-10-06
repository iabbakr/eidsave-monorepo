import { Router } from "express";
import { requireAuth, requireAdmin, requireRole } from "../middlewares/auth.js";
import { AdminController } from "../controllers/admin.controller.js";
import { imageUpload } from "../lib/upload.js";

const router = Router();

router.use(requireAuth);

// ── Shared visibility: admin + support ──────────────────────────────────
// Support agents need to see platform health and orders/tickets to do their
// job, but shouldn't be able to manage users, the catalog, broadcasts,
// earnings, or the cache.
router.get("/stats", requireRole("admin", "support"), AdminController.getStats);
router.get("/orders", requireRole("admin", "support"), AdminController.getAllOrders);
router.get("/support/tickets", requireRole("admin", "support"), AdminController.getAllTickets);
router.put("/support/tickets/:id/status", requireRole("admin", "support"), AdminController.updateTicketStatus);

// ── Admin-only ───────────────────────────────────────────────────────────
router.get("/users", requireAdmin, AdminController.listUsers);
router.put("/users/:id/status", requireAdmin, AdminController.updateUserStatus);
router.put("/orders/:id/status", requireAdmin, AdminController.updateOrderStatus);
router.post("/animals", requireAdmin, AdminController.createAnimal);
router.put("/animals/:id", requireAdmin, AdminController.updateAnimal);
router.post("/notifications/broadcast", requireAdmin, AdminController.broadcastNotification);
router.get("/earnings", requireAdmin, AdminController.getEarnings);
router.post("/maintenance/flush-cache", requireAdmin, AdminController.flushCache);
router.post("/upload/image", requireAdmin, imageUpload.single("file"), AdminController.uploadImage);

export { router as adminRouter };