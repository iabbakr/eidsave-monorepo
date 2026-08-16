import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { cacheGet, cacheSet, cacheDel, cacheKey } from "../lib/cache.js";

type OrderRow = typeof ordersTable.$inferSelect;
type OrderInsert = typeof ordersTable.$inferInsert;

const TTL = 60;

function userOrdersKey(userId: string) {
  return cacheKey("orders", "user", userId);
}

function orderKey(id: string) {
  return cacheKey("order", id);
}

export const OrderRepository = {
  async create(data: OrderInsert): Promise<OrderRow> {
    const [order] = await db.insert(ordersTable).values(data).returning();
    await cacheDel(userOrdersKey(data.userId!));
    return order!;
  },

  async findByUser(userId: string): Promise<OrderRow[]> {
    const cached = await cacheGet<OrderRow[]>(userOrdersKey(userId));
    if (cached) return cached;

    const orders = await db.select().from(ordersTable)
      .where(eq(ordersTable.userId, userId))
      .orderBy(desc(ordersTable.createdAt));

    await cacheSet(userOrdersKey(userId), orders, TTL);
    return orders;
  },

  async findById(id: string, userId?: string): Promise<OrderRow | null> {
    const cached = await cacheGet<OrderRow>(orderKey(id));
    if (cached) {
      if (userId && cached.userId !== userId) return null;
      return cached;
    }

    const conditions = userId
      ? and(eq(ordersTable.id, id), eq(ordersTable.userId, userId))
      : eq(ordersTable.id, id);

    const [order] = await db.select().from(ordersTable).where(conditions).limit(1);
    if (order) await cacheSet(orderKey(id), order, TTL);
    return order ?? null;
  },

  async findAll(filters?: { status?: string; eidType?: string }): Promise<OrderRow[]> {
    const rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    let filtered = rows;
    if (filters?.status) filtered = filtered.filter(o => o.status === filters.status);
    if (filters?.eidType) filtered = filtered.filter(o => o.eidType === filters.eidType);
    return filtered;
  },

  async updateStatus(id: string, status: string, deliveredAt?: Date): Promise<OrderRow | null> {
    const [order] = await db.update(ordersTable)
      .set({ status, deliveredAt: deliveredAt ?? undefined })
      .where(eq(ordersTable.id, id))
      .returning();
    if (order) {
      await cacheDel(orderKey(id));
      await cacheDel(userOrdersKey(order.userId));
    }
    return order ?? null;
  },
};
