import cron from "node-cron";
import { runWalletUnlockJob } from "./walletUnlock.job.js";
import { runDepositReconcileJob } from "./depositReconcile.job.js";
import { logger } from "../lib/logger.js";

export function startJobs(): void {
  logger.info("Starting background jobs");

  cron.schedule("0 0 * * *", async () => {
    logger.info("Running wallet unlock job");
    await runWalletUnlockJob();
  });

  cron.schedule("*/10 * * * *", async () => {
    await runDepositReconcileJob();
  });

  cron.schedule("0 1 * * *", async () => {
    logger.info("Running daily maintenance jobs");
  });

  runWalletUnlockJob().catch(err => logger.error({ err }, "Initial wallet unlock failed"));

  logger.info("Background jobs started");
}