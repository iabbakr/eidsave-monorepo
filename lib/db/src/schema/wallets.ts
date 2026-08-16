import { pgTable, text, boolean, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(), // 'adha' | 'fitr'
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  mode: text("mode").notNull().default("withdraw"), // 'withdraw' | 'purchase' | 'group' | 'individual'
  selectedAnimalId: uuid("selected_animal_id"),
  selectedAnimalSize: text("selected_animal_size"),
  lockedToPurchase: boolean("locked_to_purchase").notNull().default(false),
  withdrawalUnlockedAt: timestamp("withdrawal_unlocked_at"),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }),
  cycleId: uuid("cycle_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
