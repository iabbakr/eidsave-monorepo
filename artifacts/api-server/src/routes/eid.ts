import { Router } from "express";
import { EidController } from "../controllers/eid.controller.js";

const router = Router();

router.get("/dates", EidController.getDates);

export { router as eidRouter };
