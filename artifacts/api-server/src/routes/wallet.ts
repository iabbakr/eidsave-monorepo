import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { WalletController } from "../controllers/wallet.controller.js";
import { DepositInitSchema, DepositVerifySchema, WithdrawSchema } from "../schema/wallet.schema.js";

const router = Router();

router.get("/:type", requireAuth, WalletController.getWallet);
router.post("/:type/deposit/init", requireAuth, validate(DepositInitSchema), WalletController.initDeposit);
router.post("/:type/deposit/verify", requireAuth, validate(DepositVerifySchema), WalletController.verifyDeposit);
router.post("/:type/withdraw", requireAuth, validate(WithdrawSchema), WalletController.withdraw);
router.get("/:type/transactions", requireAuth, WalletController.getTransactions);

export { router as walletRouter };
