import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { OrderController } from "../controllers/order.controller.js";
import { PlaceOrderSchema } from "../schema/orders.schema.js";

const router = Router();

router.post("/", requireAuth, validate(PlaceOrderSchema), OrderController.placeOrder);
router.get("/mine", requireAuth, OrderController.getMyOrders);
router.get("/:orderId", requireAuth, OrderController.getOrder);

export { router as ordersRouter };
