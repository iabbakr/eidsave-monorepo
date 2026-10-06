import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { AuthController } from "../controllers/auth.controller.js";
import {
  RegisterSchema,
  LoginSchema,
  SetPinSchema,
  VerifyPinSchema,
  ChangePinSchema,
} from "../schema/auth.schema.js";

const router = Router();

router.post("/register", validate(RegisterSchema), AuthController.register);
router.post("/login", validate(LoginSchema), AuthController.login);
router.post("/set-pin", requireAuth, validate(SetPinSchema), AuthController.setPin);
router.post("/verify-pin", requireAuth, validate(VerifyPinSchema), AuthController.verifyPin);
router.post("/change-pin", requireAuth, validate(ChangePinSchema), AuthController.changePin);

export { router as authRouter };