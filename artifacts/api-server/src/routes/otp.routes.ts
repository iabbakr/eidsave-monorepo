import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { OtpController } from "../controllers/otp.controller.js";
import { SendOtpSchema, VerifyOtpSchema } from "../schema/otp.schema.js";

const router = Router();

// Intentionally NOT behind requireAuth — this runs before the account exists.
router.post("/send-verification", validate(SendOtpSchema), OtpController.sendVerification);
router.post("/verify-email", validate(VerifyOtpSchema), OtpController.verifyEmail);

export { router as otpRouter };
