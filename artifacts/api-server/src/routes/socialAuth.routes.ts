import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { SocialAuthController } from "../controllers/socialAuth.controller.js";
import { SocialAuthSchema } from "../schema/socialAuth.schema.js";

const router = Router();

router.post("/social", validate(SocialAuthSchema), SocialAuthController.authenticate);

export { router as socialAuthRouter };
