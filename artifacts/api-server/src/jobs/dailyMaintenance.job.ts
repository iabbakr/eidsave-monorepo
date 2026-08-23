import cron from "node-cron";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { gte, sql } from "drizzle-orm";
import { cacheDelPattern, cacheKey } from "../lib/cache.js";
import { runWalletUnlockJob } from "./walletUnlock.job.js";
import { logger } from "../lib/logger.js";

export function startMaintenanceSchedules(): void {
  logger.info("Initializing daily cron maintenance jobs");

  // Daily at 00:00 - Wallet Unlock Window Check
  cron.schedule("0 0 * * *", async () => {
    logger.info("Executing scheduled midnight wallet unlock check");
    await runWalletUnlockJob();
  });

  // Daily at 01:00 - Recalculate Saving Streaks
  cron.schedule("0 1 * * *", async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentDepositors = await db
        .selectDistinct({ userId: transactionsTable.userId })
        .from(transactionsTable)
        .where(gte(transactionsTable.createdAt, thirtyDaysAgo));

      const activeUserIds = recentDepositors
        .map((d) => d.userId)
        .filter((id): id is string => Boolean(id));

      if (activeUserIds.length > 0) {
        await db.execute(
          sql`UPDATE ${usersTable} SET savings_streak = savings_streak + 1 WHERE id = ANY(${activeUserIds})`
        );
        await cacheDelPattern(cacheKey("user", "*"));
        logger.info({ updatedUsers: activeUserIds.length }, "Weekly saving streaks incremented");
      }
    } catch (err) {
      logger.error({ err }, "Saving streak recalculation job encountered an error");
    }
  });

  // Daily at 03:00 - Cache Eviction
  cron.schedule("0 3 * * *", async () => {
    try {
      await cacheDelPattern("eidsave:*");
      logger.info("Daily Redis memory flush completed");
    } catch (err) {
      logger.error({ err }, "Daily cache eviction failed");
    }
  });
}