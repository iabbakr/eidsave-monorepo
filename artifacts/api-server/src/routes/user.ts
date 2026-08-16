import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { UserController } from "../controllers/user.controller.js";
import { UpdateProfileSchema, PushTokenSchema } from "../schema/user.schema.js";

const router = Router();

router.get("/profile", requireAuth, UserController.getProfile);
router.put("/profile", requireAuth, validate(UpdateProfileSchema), UserController.updateProfile);
router.post("/push-token", requireAuth, validate(PushTokenSchema), UserController.savePushToken);

export { router as userRouter };
