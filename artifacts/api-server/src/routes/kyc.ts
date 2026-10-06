import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { KycController } from "../controllers/kyc.controller.js";
import { KycVerifySchema } from "../schema/kyc.schema.js";

const router = Router();

router.get("/status", requireAuth, KycController.status);
router.post("/verify", requireAuth, validate(KycVerifySchema), KycController.verify);

export { router as kycRouter };