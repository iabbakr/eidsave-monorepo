import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { userNotificationsTable } from "@workspace/db/schema";
import { cacheGet, cacheSet, cacheDel, cacheKey } from "../lib/cache.js";

type NotifRow = typeof userNotificationsTable.$inferSelect;
type NotifInsert = typeof userNotificationsTable.$inferInsert;

const UNREAD_TTL = 30;

function unreadCountKey(userId: string): string {
  return cacheKey("notifications", userId, "unread");
}

export const NotificationRepository = {
  async create(data: NotifInsert): Promise<NotifRow> {
    const [row] = await db.insert(userNotificationsTable).values(data).returning();
    await cacheDel(unreadCountKey(data.userId));
    return row!;
  },

  /** Bulk insert for broadcasts — one round trip instead of N. */
  async createMany(rows: NotifInsert[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(userNotificationsTable).values(rows);
    const userIds = [...new Set(rows.map(r => r.userId))];
    await Promise.all(userIds.map(id => cacheDel(unreadCountKey(id))));
  },

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ notifications: NotifRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const notifications = await db.select().from(userNotificationsTable)
      .where(eq(userNotificationsTable.userId, userId))
      .orderBy(desc(userNotificationsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const allForCount = await db.select({ id: userNotificationsTable.id }).from(userNotificationsTable)
      .where(eq(userNotificationsTable.userId, userId));

    return { notifications, total: allForCount.length };
  },

  async unreadCount(userId: string): Promise<number> {
    const cached = await cacheGet<number>(unreadCountKey(userId));
    if (cached !== null) return cached;

    const rows = await db.select({ id: userNotificationsTable.id }).from(userNotificationsTable)
      .where(and(eq(userNotificationsTable.userId, userId), eq(userNotificationsTable.read, false)));

    const count = rows.length;
    await cacheSet(unreadCountKey(userId), count, UNREAD_TTL);
    return count;
  },

  async markAsRead(userId: string, id: string): Promise<NotifRow | null> {
    const [row] = await db.update(userNotificationsTable)
      .set({ read: true })
      .where(and(eq(userNotificationsTable.id, id), eq(userNotificationsTable.userId, userId)))
      .returning();
    if (row) await cacheDel(unreadCountKey(userId));
    return row ?? null;
  },

  async markAllAsRead(userId: string): Promise<void> {
    await db.update(userNotificationsTable)
      .set({ read: true })
      .where(and(eq(userNotificationsTable.userId, userId), eq(userNotificationsTable.read, false)));
    await cacheDel(unreadCountKey(userId));
  },
};