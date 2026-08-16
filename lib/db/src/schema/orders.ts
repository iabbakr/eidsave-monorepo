import { pgTable, text, integer, numeric, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { animalsTable } from "./animals";

export const ordersTable = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  animalId: uuid("animal_id").notNull().references(() => animalsTable.id),
  animalName: text("animal_name").notNull(),
  size: text("size").notNull(),
  quantity: integer("quantity").notNull().default(1),
  totalPrice: numeric("total_price", { precision: 15, scale: 2 }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 15, scale: 2 }).notNull().default("0"),
  recipients: jsonb("recipients")
    .notNull()
    .$type<Array<{
      name: string;
      phone: string;
      address: { state: string; city: string; town?: string; street: string };
      deliveryFee: number;
    }>>(),
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'dispatched' | 'delivered'
  eidType: text("eid_type").notNull(),
  cycleId: uuid("cycle_id"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
