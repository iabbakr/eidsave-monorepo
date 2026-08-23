import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  // nullable now — social-only accounts (Google/Apple) have no password
  passwordHash: text("password_hash"),
  state: text("state"),
  city: text("city"),
  area: text("area"),
  address: text("address"),
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
  // new: email verification + social auth + gated onboarding
  emailVerified: boolean("email_verified").notNull().default(false),
  authProvider: text("auth_provider").notNull().default("password"), // "password" | "google" | "apple"
  providerUid: text("provider_uid"),
  profileSetupCompleted: boolean("profile_setup_completed").notNull().default(false),
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