import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { receiptsTable } from "@workspace/db/schema";

type ReceiptRow = typeof receiptsTable.$inferSelect;
type ReceiptInsert = typeof receiptsTable.$inferInsert;

export const ReceiptRepository = {
  async create(data: ReceiptInsert): Promise<ReceiptRow> {
    const [row] = await db.insert(receiptsTable).values(data).returning();
    return row!;
  },

  async findByReference(reference: string): Promise<ReceiptRow | null> {
    const [row] = await db.select().from(receiptsTable)
      .where(eq(receiptsTable.reference, reference))
      .limit(1);
    return row ?? null;
  },

  async markEmailSent(reference: string): Promise<void> {
    await db.update(receiptsTable)
      .set({ emailSentAt: new Date() })
      .where(eq(receiptsTable.reference, reference));
  },

  async markPushSent(reference: string): Promise<void> {
    await db.update(receiptsTable)
      .set({ pushSentAt: new Date() })
      .where(eq(receiptsTable.reference, reference));
  },
};