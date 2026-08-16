import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  state: text("state"),
  city: text("city"),
  town: text("town"),
  street: text("street"),
  nextOfKinName: text("next_of_kin_name"),
  nextOfKinPhone: text("next_of_kin_phone"),
  nextOfKinRelationship: text("next_of_kin_relationship"),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  hasPin: boolean("has_pin").notNull().default(false),
  pinHash: text("pin_hash"),
  savingsStreak: integer("savings_streak").notNull().default(0),
  referralCode: text("referral_code").notNull().unique(),
  pushToken: text("push_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
