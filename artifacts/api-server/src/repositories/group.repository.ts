import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { groupsTable, groupMembersTable, groupContributionsTable } from "@workspace/db/schema";
import { cacheGet, cacheSet, cacheDel, cacheKey } from "../lib/cache.js";

type GroupRow = typeof groupsTable.$inferSelect;
type GroupInsert = typeof groupsTable.$inferInsert;
type MemberRow = typeof groupMembersTable.$inferSelect;

const TTL = 60;
const MEMBER_TTL = 30;
const ALL_KEY = cacheKey("groups", "all");

function groupKey(id: string) {
  return cacheKey("group", id);
}

function membersKey(groupId: string) {
  return cacheKey("group", groupId, "members");
}

export const GroupRepository = {
  async findAll(): Promise<GroupRow[]> {
    const cached = await cacheGet<GroupRow[]>(ALL_KEY);
    if (cached) return cached;
    const groups = await db.select().from(groupsTable).orderBy(desc(groupsTable.createdAt));
    await cacheSet(ALL_KEY, groups, TTL);
    return groups;
  },

  async findById(id: string): Promise<GroupRow | null> {
    const cached = await cacheGet<GroupRow>(groupKey(id));
    if (cached) return cached;
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id)).limit(1);
    if (group) await cacheSet(groupKey(id), group, TTL);
    return group ?? null;
  },

  async create(data: GroupInsert): Promise<GroupRow> {
    const [group] = await db.insert(groupsTable).values(data).returning();
    await cacheDel(ALL_KEY);
    return group!;
  },

  async update(id: string, data: Partial<GroupInsert>): Promise<GroupRow | null> {
    const [group] = await db.update(groupsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groupsTable.id, id))
      .returning();
    if (group) {
      await cacheDel(groupKey(id));
      await cacheDel(ALL_KEY);
    }
    return group ?? null;
  },

  async findMembers(groupId: string): Promise<MemberRow[]> {
    const cached = await cacheGet<MemberRow[]>(membersKey(groupId));
    if (cached) return cached;
    const members = await db.select().from(groupMembersTable)
      .where(eq(groupMembersTable.groupId, groupId));
    await cacheSet(membersKey(groupId), members, MEMBER_TTL);
    return members;
  },

  async findMembership(groupId: string, userId: string): Promise<MemberRow | null> {
    const [member] = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
      .limit(1);
    return member ?? null;
  },

  async addMember(data: { groupId: string; userId: string }): Promise<MemberRow> {
    const [member] = await db.insert(groupMembersTable).values(data).returning();
    await cacheDel(membersKey(data.groupId));
    return member!;
  },

  async updateMember(id: string, totalContribution: string): Promise<void> {
    await db.update(groupMembersTable)
      .set({ totalContribution })
      .where(eq(groupMembersTable.id, id));
  },

  async addContribution(data: { groupId: string; userId: string; amount: string }): Promise<void> {
    await db.insert(groupContributionsTable).values(data);
  },

  async invalidateGroup(id: string): Promise<void> {
    await cacheDel(groupKey(id));
    await cacheDel(ALL_KEY);
  },
};
