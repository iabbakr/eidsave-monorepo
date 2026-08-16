import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { GroupController } from "../controllers/group.controller.js";
import { CreateGroupSchema, ContributeSchema } from "../schema/groups.schema.js";

const router = Router();

router.get("/", requireAuth, GroupController.listGroups);
router.post("/", requireAuth, validate(CreateGroupSchema), GroupController.createGroup);
router.get("/:groupId", requireAuth, GroupController.getGroup);
router.post("/:groupId/join", requireAuth, GroupController.joinGroup);
router.post("/:groupId/contribute", requireAuth, validate(ContributeSchema), GroupController.contribute);

export { router as groupsRouter };
