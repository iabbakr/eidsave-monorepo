import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { walletsTable } from "@workspace/db/schema";
import { cacheGet, cacheSet, cacheDel, cacheKey } from "../lib/cache.js";

type WalletRow = typeof walletsTable.$inferSelect;
type WalletInsert = typeof walletsTable.$inferInsert;

const TTL = 30;

function key(userId: string, type: string) {
  return cacheKey("wallet", userId, type);
}

export const WalletRepository = {
  async findByUserAndType(userId: string, type: "adha" | "fitr"): Promise<WalletRow | null> {
    const cached = await cacheGet<WalletRow>(key(userId, type));
    if (cached) return cached;

    const [wallet] = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.userId, userId), eq(walletsTable.type, type)))
      .limit(1);
    if (wallet) await cacheSet(key(userId, type), wallet, TTL);
    return wallet ?? null;
  },

  async findAllByUser(userId: string): Promise<WalletRow[]> {
    return db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  },

  async create(data: WalletInsert): Promise<WalletRow> {
    const [wallet] = await db.insert(walletsTable).values(data).returning();
    return wallet!;
  },

  async update(id: string, data: Partial<WalletInsert>): Promise<WalletRow | null> {
    const [wallet] = await db.update(walletsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(walletsTable.id, id))
      .returning();
    if (wallet) {
      await cacheDel(key(wallet.userId, wallet.type));
    }
    return wallet ?? null;
  },

  async updateBalance(id: string, balance: string, userId: string, type: string): Promise<WalletRow | null> {
    const [wallet] = await db.update(walletsTable)
      .set({ balance, updatedAt: new Date() })
      .where(eq(walletsTable.id, id))
      .returning();
    await cacheDel(key(userId, type));
    return wallet ?? null;
  },
};
