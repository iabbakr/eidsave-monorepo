import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { eidCyclesTable } from "@workspace/db/schema";
import { cacheGet, cacheSet, cacheKey } from "../lib/cache.js";

type CycleRow = typeof eidCyclesTable.$inferSelect;

const TTL = 3600;
const ALL_KEY = cacheKey("eid", "cycles", "active");

export const EidRepository = {
  async findActiveCycles(): Promise<CycleRow[]> {
    const cached = await cacheGet<CycleRow[]>(ALL_KEY);
    if (cached) return cached;
    const cycles = await db.select().from(eidCyclesTable).where(eq(eidCyclesTable.isActive, true));
    await cacheSet(ALL_KEY, cycles, TTL);
    return cycles;
  },

  async findAll(): Promise<CycleRow[]> {
    return db.select().from(eidCyclesTable);
  },

  async findActiveCycleByType(type: "adha" | "fitr"): Promise<CycleRow | null> {
    const cycles = await this.findActiveCycles();
    return cycles.find(c => c.eidType === type) ?? null;
  },
};
