import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { AdminController } from "../controllers/admin.controller.js";
import { imageUpload } from "../lib/upload.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", AdminController.getStats);
router.get("/users", AdminController.listUsers);
router.put("/users/:id/status", AdminController.updateUserStatus);
router.get("/orders", AdminController.getAllOrders);
router.put("/orders/:id/status", AdminController.updateOrderStatus);
router.post("/animals", AdminController.createAnimal);
router.put("/animals/:id", AdminController.updateAnimal);
router.post("/notifications/broadcast", AdminController.broadcastNotification);
router.get("/earnings", AdminController.getEarnings);
router.post("/maintenance/flush-cache", AdminController.flushCache);
router.get("/support/tickets", AdminController.getAllTickets);
router.put("/support/tickets/:id/status", AdminController.updateTicketStatus);
router.post("/upload/image", imageUpload.single("file"), AdminController.uploadImage);

export { router as adminRouter };
