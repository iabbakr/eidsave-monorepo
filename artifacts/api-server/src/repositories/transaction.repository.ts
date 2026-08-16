import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";

type TxRow = typeof transactionsTable.$inferSelect;
type TxInsert = typeof transactionsTable.$inferInsert;

export const TransactionRepository = {
  async create(data: TxInsert): Promise<TxRow> {
    const [tx] = await db.insert(transactionsTable).values(data).returning();
    return tx!;
  },

  async findByReference(reference: string): Promise<TxRow | null> {
    const [tx] = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.reference, reference))
      .limit(1);
    return tx ?? null;
  },

  async findByUserAndWallet(
    userId: string,
    walletType: "adha" | "fitr",
    page = 1,
    limit = 20,
  ): Promise<{ transactions: TxRow[]; total: number }> {
    const offset = (page - 1) * limit;
    const transactions = await db.select().from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.walletType, walletType),
      ))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const allForCount = await db.select({ id: transactionsTable.id }).from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.walletType, walletType),
      ));

    return { transactions, total: allForCount.length };
  },

  async updateStatus(reference: string, status: "pending" | "success" | "failed"): Promise<TxRow | null> {
    const [tx] = await db.update(transactionsTable)
      .set({ status })
      .where(eq(transactionsTable.reference, reference))
      .returning();
    return tx ?? null;
  },
};
