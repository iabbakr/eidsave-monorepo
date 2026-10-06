import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { WalletController } from "../controllers/wallet.controller.js";
import { WithdrawSchema } from "../schema/wallet.schema.js";

const router = Router();

// Static paths MUST come before "/:type" or they get swallowed by it.
router.get("/banks", requireAuth, WalletController.banks);
router.get("/resolve-account", requireAuth, WalletController.resolveAccount);

router.get("/:type", requireAuth, WalletController.getWallet);
router.post("/:type/deposit/account", requireAuth, WalletController.getDepositAccount);
router.post("/:type/deposit/sync", requireAuth, WalletController.syncDeposits);
router.post("/:type/withdraw", requireAuth, validate(WithdrawSchema), WalletController.withdraw);
router.get("/:type/transactions", requireAuth, WalletController.getTransactions);

export { router as walletRouter };