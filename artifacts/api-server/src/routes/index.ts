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
import locationRouter from "./locations.js";
import { otpRouter } from "./otp.routes.js";

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
router.use("/v1/locations", locationRouter);
router.use("/v1/otp", otpRouter);

// NOTE: /v1/webhooks/paystack is intentionally NOT mounted here.
// It is registered directly on the app in app.ts, ahead of express.json(),
// because Paystack's webhook signature must be verified against the raw
// request body — see lib/webhookRawBody.ts for details. routes/webhook.ts
// is no longer used and can be deleted.

export default router;