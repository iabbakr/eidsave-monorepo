import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { SupportController } from "../controllers/support.controller.js";
import { CreateTicketSchema } from "../schema/support.schema.js";

const router = Router();

router.post("/ticket", requireAuth, validate(CreateTicketSchema), SupportController.createTicket);
router.get("/tickets/mine", requireAuth, SupportController.getMyTickets);

export { router as supportRouter };
