import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { AdminController } from "../controllers/admin.controller.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", AdminController.getStats);
router.get("/users", AdminController.listUsers);
router.get("/orders", AdminController.getAllOrders);
router.put("/orders/:id/status", AdminController.updateOrderStatus);
router.post("/animals", AdminController.createAnimal);
router.put("/animals/:id", AdminController.updateAnimal);

export { router as adminRouter };
