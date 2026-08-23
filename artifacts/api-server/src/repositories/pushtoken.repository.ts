import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db/schema";

type TokenRow = typeof pushTokensTable.$inferSelect;

export const PushTokenRepository = {
  /**
   * Upserts by token (not userId) — the same physical device's Expo push
   * token is the natural unique key. If a token gets re-registered under a
   * different user (e.g. shared device, account switch on same phone), it
   * moves to the new owner rather than creating a duplicate row.
   */
  async upsert(params: { userId: string; token: string; deviceId?: string; platform?: string }): Promise<TokenRow> {
    const [existing] = await db.select().from(pushTokensTable)
      .where(eq(pushTokensTable.token, params.token))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(pushTokensTable)
        .set({
          userId: params.userId,
          deviceId: params.deviceId,
          platform: params.platform,
          lastSeenAt: new Date(),
        })
        .where(eq(pushTokensTable.token, params.token))
        .returning();
      return updated!;
    }

    const [created] = await db.insert(pushTokensTable).values({
      userId: params.userId,
      token: params.token,
      deviceId: params.deviceId,
      platform: params.platform,
    }).returning();
    return created!;
  },

  async findByUser(userId: string): Promise<TokenRow[]> {
    return db.select().from(pushTokensTable).where(eq(pushTokensTable.userId, userId));
  },

  async findAll(): Promise<TokenRow[]> {
    return db.select().from(pushTokensTable);
  },

  async removeByToken(token: string): Promise<void> {
    await db.delete(pushTokensTable).where(eq(pushTokensTable.token, token));
  },
};