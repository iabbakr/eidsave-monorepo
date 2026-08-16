import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { cacheGet, cacheSet, cacheDel, cacheKey } from "../lib/cache.js";

type UserRow = typeof usersTable.$inferSelect;
type UserInsert = typeof usersTable.$inferInsert;

const TTL = 300;

function key(id: string) {
  return cacheKey("user", id);
}

export const UserRepository = {
  async findById(id: string): Promise<UserRow | null> {
    const cached = await cacheGet<UserRow>(key(id));
    if (cached) return cached;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (user) await cacheSet(key(id), user, TTL);
    return user ?? null;
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return user ?? null;
  },

  async findByReferralCode(code: string): Promise<UserRow | null> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.referralCode, code)).limit(1);
    return user ?? null;
  },

  async create(data: UserInsert): Promise<UserRow> {
    const [user] = await db.insert(usersTable).values(data).returning();
    return user!;
  },

  async update(id: string, data: Partial<UserInsert>): Promise<UserRow | null> {
    const [user] = await db.update(usersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();
    if (user) {
      await cacheSet(key(id), user, TTL);
    }
    return user ?? null;
  },

  async invalidate(id: string): Promise<void> {
    await cacheDel(key(id));
  },

  async findAll(): Promise<UserRow[]> {
    return db.select().from(usersTable).orderBy(usersTable.createdAt);
  },
};
