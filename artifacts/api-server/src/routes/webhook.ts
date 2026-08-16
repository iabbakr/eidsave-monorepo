import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controller.js";

const router = Router();

router.post("/paystack", WebhookController.paystack);

export { router as webhookRouter };
