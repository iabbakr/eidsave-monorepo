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
  avatarUrl: text("avatar_url"),
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
  // email verification + social auth + gated onboarding
  emailVerified: boolean("email_verified").notNull().default(false),
  authProvider: text("auth_provider").notNull().default("password"), // "password" | "google" | "apple"
  providerUid: text("provider_uid"),
  profileSetupCompleted: boolean("profile_setup_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
   // --- KYC / Xpress Wallet ---
  dateOfBirth: text("date_of_birth"),                         // YYYY-MM-DD
  bvnLast4: text("bvn_last4"),                                // never store the full BVN
  kycStatus: text("kyc_status").notNull().default("none"),    // "none" | "verified"
  kycTier: text("kyc_tier"),                                  // "TIER_1" | "TIER_2" | "TIER_3" as returned by Xpress
  kycNameMatch: boolean("kyc_name_match"),                    // Xpress's BVN-vs-submitted-name result
  xpressCustomerId: text("xpress_customer_id").unique(),
  virtualAccountNumber: text("virtual_account_number").unique(),
  virtualBankName: text("virtual_bank_name"),
  virtualAccountName: text("virtual_account_name"),
  depositTargetWallet: text("deposit_target_wallet").notNull().default("adha"), // "adha" | "fitr"

});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;