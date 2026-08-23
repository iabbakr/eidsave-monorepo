import { pgTable, text, numeric, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { transactionsTable } from "./transactions";

export const receiptsTable = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  transactionId: uuid("transaction_id").references(() => transactionsTable.id),
  type: text("type").notNull(), // 'deposit' | 'withdrawal' | 'purchase'
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  walletType: text("wallet_type"), // 'adha' | 'fitr' — nullable, not always applicable
  reference: text("reference").notNull().unique(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  emailSentAt: timestamp("email_sent_at"),
  pushSentAt: timestamp("push_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({
  id: true,
  createdAt: true,
  emailSentAt: true,
  pushSentAt: true,
});

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;