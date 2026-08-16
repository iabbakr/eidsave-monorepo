import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { animalsTable } from "@workspace/db/schema";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern, cacheKey } from "../lib/cache.js";

type AnimalRow = typeof animalsTable.$inferSelect;
type AnimalInsert = typeof animalsTable.$inferInsert;

const TTL = 600;
const ALL_KEY = cacheKey("animals", "all");

function singleKey(id: string) {
  return cacheKey("animal", id);
}

export const AnimalRepository = {
  async findAll(filters?: { eidType?: string; category?: string }): Promise<AnimalRow[]> {
    const cacheK = filters
      ? cacheKey("animals", filters.eidType ?? "any", filters.category ?? "any")
      : ALL_KEY;

    const cached = await cacheGet<AnimalRow[]>(cacheK);
    if (cached) return cached;

    const rows = await db.select().from(animalsTable).where(eq(animalsTable.isAvailable, true));
    let filtered = rows;
    if (filters?.eidType) {
      filtered = filtered.filter(a => a.eidType === filters.eidType || a.eidType === "both");
    }
    if (filters?.category) {
      filtered = filtered.filter(a => a.category === filters.category);
    }

    await cacheSet(cacheK, filtered, TTL);
    return filtered;
  },

  async findById(id: string): Promise<AnimalRow | null> {
    const cached = await cacheGet<AnimalRow>(singleKey(id));
    if (cached) return cached;

    const [animal] = await db.select().from(animalsTable).where(eq(animalsTable.id, id)).limit(1);
    if (animal) await cacheSet(singleKey(id), animal, TTL);
    return animal ?? null;
  },

  async create(data: AnimalInsert): Promise<AnimalRow> {
    const [animal] = await db.insert(animalsTable).values(data).returning();
    await cacheDelPattern(cacheKey("animals", "*"));
    return animal!;
  },

  async update(id: string, data: Partial<AnimalInsert>): Promise<AnimalRow | null> {
    const [animal] = await db.update(animalsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(animalsTable.id, id))
      .returning();
    if (animal) {
      await cacheDel(singleKey(id));
      await cacheDelPattern(cacheKey("animals", "*"));
    }
    return animal ?? null;
  },
};
