import { pgTable, text, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const animalsTable = pgTable("animals", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'Ram' | 'Goat' | 'Cow' | 'Chicken' | 'Duck' | 'Ostrich'
  subcategory: text("subcategory"), // 'Agric' | 'Local' for chickens
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  sizes: jsonb("sizes")
    .notNull()
    .$type<Array<{ label: string; weight: string; price: number }>>(),
  isAvailable: boolean("is_available").notNull().default(true),
  stock: text("stock").notNull().default("available"), // 'available' | 'limited' | 'out_of_stock'
  eidType: text("eid_type").notNull(), // 'adha' | 'fitr' | 'both'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAnimalSchema = createInsertSchema(animalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAnimal = z.infer<typeof insertAnimalSchema>;
export type Animal = typeof animalsTable.$inferSelect;
