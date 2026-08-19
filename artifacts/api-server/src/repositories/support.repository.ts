import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { supportTicketsTable } from "@workspace/db/schema";
import { cacheGet, cacheSet, cacheDel, cacheKey } from "../lib/cache.js";

type TicketRow = typeof supportTicketsTable.$inferSelect;
type TicketInsert = typeof supportTicketsTable.$inferInsert;

const TTL = 60;

function userTicketsKey(userId: string) {
  return cacheKey("tickets", "user", userId);
}

export const SupportRepository = {
  async create(data: TicketInsert): Promise<TicketRow> {
    const [ticket] = await db.insert(supportTicketsTable).values(data).returning();
    await cacheDel(userTicketsKey(data.userId!));
    return ticket!;
  },

  async findByUser(userId: string): Promise<TicketRow[]> {
    const cached = await cacheGet<TicketRow[]>(userTicketsKey(userId));
    if (cached) return cached;
    const tickets = await db.select().from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, userId))
      .orderBy(desc(supportTicketsTable.createdAt));
    await cacheSet(userTicketsKey(userId), tickets, TTL);
    return tickets;
  },

  async findById(id: string): Promise<TicketRow | null> {
    const [ticket] = await db.select().from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, id)).limit(1);
    return ticket ?? null;
  },

  async updateStatus(id: string, status: string): Promise<TicketRow | null> {
    const [ticket] = await db.update(supportTicketsTable)
      .set({ status })
      .where(eq(supportTicketsTable.id, id))
      .returning();
    if (ticket) await cacheDel(userTicketsKey(ticket.userId));
    return ticket ?? null;
  },

  async findAll(filters?: { status?: string; page?: number }): Promise<TicketRow[]> {
    const tickets = await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.createdAt));
    const filtered = filters?.status
      ? tickets.filter((t) => t.status === filters.status)
      : tickets;
    const page = filters?.page ?? 1;
    const limit = 20;
    return filtered.slice((page - 1) * limit, page * limit);
  },

  async update(id: string, data: Partial<TicketInsert>): Promise<TicketRow | null> {
    const [ticket] = await db.update(supportTicketsTable)
      .set(data)
      .where(eq(supportTicketsTable.id, id))
      .returning();
    if (ticket) await cacheDel(userTicketsKey(ticket.userId));
    return ticket ?? null;
  },
};
