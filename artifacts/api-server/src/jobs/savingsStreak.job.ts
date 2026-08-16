import { gte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { cacheDelPattern, cacheKey } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

export async function runSavingsStreakJob(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDeposits = await db
      .selectDistinct({ userId: transactionsTable.userId })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, thirtyDaysAgo));

    const activeUserIds = recentDeposits
      .map(d => d.userId)
      .filter((id): id is string => id !== null && id !== undefined);

    if (activeUserIds.length === 0) return;

    await db.execute(
      sql`UPDATE ${usersTable} SET savings_streak = savings_streak + 1 WHERE id = ANY(${activeUserIds})`,
    );

    await cacheDelPattern(cacheKey("user", "*"));
    logger.info({ usersUpdated: activeUserIds.length }, "Savings streak job completed");
  } catch (err) {
    logger.error({ err }, "Savings streak job failed");
  }
}
