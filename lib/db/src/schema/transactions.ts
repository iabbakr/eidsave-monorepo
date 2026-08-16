import { pgTable, text, numeric, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(), // 'deposit' | 'withdrawal' | 'purchase' | 'delivery_fee'
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  walletType: text("wallet_type").notNull(), // 'adha' | 'fitr'
  status: text("status").notNull().default("pending"), // 'pending' | 'success' | 'failed'
  reference: text("reference").notNull().unique(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
