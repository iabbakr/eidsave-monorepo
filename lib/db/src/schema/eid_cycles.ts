import { pgTable, text, boolean, integer, timestamp, uuid, date } from "drizzle-orm/pg-core";

export const eidCyclesTable = pgTable("eid_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  eidType: text("eid_type").notNull(), // 'adha' | 'fitr'
  year: integer("year").notNull(),
  eidDate: date("eid_date").notNull(),
  withdrawalUnlockDate: date("withdrawal_unlock_date").notNull(),
  deliveryStartDate: date("delivery_start_date").notNull(),
  deliveryEndDate: date("delivery_end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EidCycle = typeof eidCyclesTable.$inferSelect;
