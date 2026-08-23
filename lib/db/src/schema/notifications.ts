import { pgTable, text, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userNotificationsTable = pgTable("user_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // 'deposit' | 'withdrawal' | 'purchase' | 'order' | 'group' | 'security' | 'system' | 'broadcast'
  type: text("type").notNull(),
  reference: text("reference"),
  data: jsonb("data").$type<Record<string, unknown>>(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserNotificationSchema = createInsertSchema(userNotificationsTable).omit({
  id: true,
  read: true,
  createdAt: true,
});

export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;
export type UserNotification = typeof userNotificationsTable.$inferSelect;