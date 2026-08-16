import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { walletsTable, eidCyclesTable } from "@workspace/db/schema";
import { cacheDelPattern, cacheKey } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

export async function runWalletUnlockJob(): Promise<void> {
  try {
    const cycles = await db.select().from(eidCyclesTable).where(eq(eidCyclesTable.isActive, true));
    const now = new Date();
    let unlocked = 0;

    for (const cycle of cycles) {
      const unlockDate = new Date(cycle.withdrawalUnlockDate);
      if (now >= unlockDate) {
        const result = await db.update(walletsTable)
          .set({ withdrawalUnlockedAt: unlockDate, updatedAt: new Date() })
          .where(
            and(
              eq(walletsTable.type, cycle.eidType as "adha" | "fitr"),
              isNull(walletsTable.withdrawalUnlockedAt),
            ),
          );
        unlocked++;
      }
    }

    if (unlocked > 0) {
      await cacheDelPattern(cacheKey("wallet", "*"));
      logger.info({ cyclesProcessed: unlocked }, "Wallet unlock job completed");
    }
  } catch (err) {
    logger.error({ err }, "Wallet unlock job failed");
  }
}
