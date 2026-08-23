import { pgTable, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),

  // nullable now — social-only accounts have no password
  passwordHash: text("password_hash"),

  // address — town/street renamed
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

  // new: auth/onboarding gating
  emailVerified: boolean("email_verified").notNull().default(false),
  authProvider: text("auth_provider").notNull().default("password"), // "password" | "google" | "apple"
  providerUid: text("provider_uid"),
  profileSetupCompleted: boolean("profile_setup_completed").notNull().default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});