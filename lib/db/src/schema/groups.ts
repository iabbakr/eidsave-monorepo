import { pgTable, text, integer, numeric, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const groupsTable = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  adminUid: uuid("admin_uid").notNull().references(() => usersTable.id),
  memberLimit: integer("member_limit").notNull().default(7),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  animalId: uuid("animal_id"),
  deliveryAddress: jsonb("delivery_address").$type<{
    state: string;
    city: string;
    town?: string;
    street: string;
  } | null>(),
  status: text("status").notNull().default("open"), // 'open' | 'funded' | 'ordered' | 'delivered' | 'closed'
  eidType: text("eid_type").notNull().default("fitr"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMembersTable = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groupsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  totalContribution: numeric("total_contribution", { precision: 15, scale: 2 }).notNull().default("0"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const groupContributionsTable = pgTable("group_contributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groupsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groupsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groupsTable.$inferSelect;
