import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import { authRouter } from "./auth.js";
import { userRouter } from "./user.js";
import { walletRouter } from "./wallet.js";
import { animalsRouter } from "./animals.js";
import { ordersRouter } from "./orders.js";
import { groupsRouter } from "./groups.js";
import { eidRouter } from "./eid.js";
import { supportRouter } from "./support.js";
import { adminRouter } from "./admin.js";
import { webhookRouter } from "./webhook.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1/auth", authRouter);
router.use("/v1/user", userRouter);
router.use("/v1/wallet", walletRouter);
router.use("/v1/animals", animalsRouter);
router.use("/v1/orders", ordersRouter);
router.use("/v1/groups", groupsRouter);
router.use("/v1/eid", eidRouter);
router.use("/v1/support", supportRouter);
router.use("/v1/admin", adminRouter);
router.use("/v1/webhooks", webhookRouter);

export default router;
