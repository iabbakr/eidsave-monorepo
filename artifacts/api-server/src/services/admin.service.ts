import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, walletsTable, transactionsTable, ordersTable } from "@workspace/db/schema";
import { UserRepository } from "../repositories/user.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { SupportRepository } from "../repositories/support.repository.js";
import { AnimalService } from "./animal.service.js";
import { createError } from "../middlewares/error.js";

type TicketReply = { from: string; message: string; createdAt: string };

function toTicketResponse(ticket: NonNullable<Awaited<ReturnType<typeof SupportRepository.findById>>>) {
  return {
    id: ticket.id,
    userId: ticket.userId,
    category: ticket.category as "deposit" | "delivery" | "wrong_info" | "account" | "other",
    message: ticket.message,
    photos: (ticket.photos as string[]) ?? [],
    status: ticket.status as "open" | "in_progress" | "resolved" | "closed",
    replies: (ticket.replies as TicketReply[]) ?? [],
    createdAt: ticket.createdAt.toISOString(),
  };
}

function parseAmount(value: string | number): number {
  return parseFloat(String(value));
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildPeriodBuckets(period: "week" | "month" | "year") {
  const now = new Date();
  const buckets: { label: string; start: Date; end: Date }[] = [];

  if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      buckets.push({
        label: start.toLocaleDateString("en-NG", { weekday: "short" }),
        start,
        end,
      });
    }
    return buckets;
  }

  if (period === "month") {
    for (let i = 3; i >= 0; i--) {
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - i, 1));
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      buckets.push({
        label: start.toLocaleDateString("en-NG", { month: "short" }),
        start,
        end,
      });
    }
    return buckets;
  }

  for (let i = 11; i >= 0; i--) {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    buckets.push({
      label: start.toLocaleDateString("en-NG", { month: "short" }),
      start,
      end,
    });
  }
  return buckets;
}

export const AdminService = {
  async getStats() {
    const [users, adhaWallets, fitrWallets, orders] = await Promise.all([
      db.select().from(usersTable),
      db.select().from(walletsTable).where(eq(walletsTable.type, "adha")),
      db.select().from(walletsTable).where(eq(walletsTable.type, "fitr")),
      db.select().from(ordersTable),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deposits = await db.select().from(transactionsTable).where(eq(transactionsTable.type, "deposit"));
    const todayDeposits = deposits.filter(t => t.createdAt >= today && t.status === "success");

    const totalAdha = adhaWallets.reduce((s, w) => s + parseFloat(w.balance as string), 0);
    const totalFitr = fitrWallets.reduce((s, w) => s + parseFloat(w.balance as string), 0);

    return {
      totalUsers: users.length,
      totalAdhaBalance: totalAdha,
      totalFitrBalance: totalFitr,
      totalPlatformBalance: totalAdha + totalFitr,
      activeOrders: orders.filter(o => o.status !== "delivered").length,
      pendingDeliveries: orders.filter(o => o.status === "dispatched").length,
      todayDeposits: todayDeposits.reduce((s, t) => s + parseFloat(t.amount as string), 0),
      todayDepositCount: todayDeposits.length,
    };
  },

  async listUsers(query?: string, state?: string, page = 1) {
    const limit = 20;
    let users = await UserRepository.findAll();

    if (query) {
      const q = query.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q),
      );
    }
    if (state) {
      users = users.filter(u => u.state === state);
    }

    const total = users.length;
    const paged = users.slice((page - 1) * limit, page * limit);

    const withBalances = await Promise.all(paged.map(async (u) => {
      const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, u.id));
      const adhaWallet = wallets.find((w) => w.type === "adha");
      const fitrWallet = wallets.find((w) => w.type === "fitr");
      return {
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        state: u.state ?? "", role: u.role, isActive: u.isActive,
        adhaBalance: adhaWallet ? parseAmount(adhaWallet.balance) : 0,
        fitrBalance: fitrWallet ? parseAmount(fitrWallet.balance) : 0,
        createdAt: u.createdAt.toISOString(),
      };
    }));

    return { users: withBalances, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getAllOrders(filters?: { status?: string; eidType?: string }) {
    const orders = await OrderRepository.findAll(filters);
    return { orders: orders.map(o => ({
      id: o.id, userId: o.userId, animalId: o.animalId, animalName: o.animalName,
      size: o.size, quantity: o.quantity,
      totalPrice: parseFloat(o.totalPrice as string),
      deliveryFee: parseFloat(o.deliveryFee as string),
      recipients: o.recipients, status: o.status, eidType: o.eidType,
      cycleId: o.cycleId ?? "", createdAt: o.createdAt.toISOString(),
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
    })) };
  },

  async updateOrderStatus(orderId: string, status: string) {
    const validStatuses = ["confirmed", "dispatched", "delivered"];
    if (!validStatuses.includes(status)) throw createError("Invalid status", 400);

    const order = await OrderRepository.updateStatus(orderId, status, status === "delivered" ? new Date() : undefined);
    if (!order) throw createError("Order not found", 404);

    return {
      id: order.id, userId: order.userId, animalId: order.animalId, animalName: order.animalName,
      size: order.size, quantity: order.quantity,
      totalPrice: parseFloat(order.totalPrice as string),
      deliveryFee: parseFloat(order.deliveryFee as string),
      recipients: order.recipients, status: order.status, eidType: order.eidType,
      cycleId: order.cycleId ?? "", createdAt: order.createdAt.toISOString(),
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
    };
  },

  createAnimal: AnimalService.createAnimal,
  updateAnimal: AnimalService.updateAnimal,

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await UserRepository.update(userId, { isActive });
    if (!user) throw createError("User not found", 404);
    return { message: isActive ? "User activated" : "User deactivated", success: true };
  },

  async getEarnings(period: "week" | "month" | "year" = "month") {
    const [transactions, users] = await Promise.all([
      db.select().from(transactionsTable).where(eq(transactionsTable.status, "success")),
      db.select().from(usersTable),
    ]);

    const deposits = transactions.filter((t) => t.type === "deposit");
    const withdrawals = transactions.filter((t) => t.type === "withdrawal");

    const sum = (items: typeof transactions) =>
      items.reduce((total, t) => total + parseAmount(t.amount), 0);

    const totalDeposits = sum(deposits);
    const totalWithdrawals = sum(withdrawals);

    const adhaDeposits = sum(deposits.filter((t) => t.walletType === "adha"));
    const fitrDeposits = sum(deposits.filter((t) => t.walletType === "fitr"));

    const stateTotals: Record<string, number> = {};
    for (const deposit of deposits) {
      const user = users.find((u) => u.id === deposit.userId);
      const state = user?.state?.trim() || "Unknown";
      stateTotals[state] = (stateTotals[state] ?? 0) + parseAmount(deposit.amount);
    }
    const topStateByDeposit = Object.entries(stateTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

    const periodBreakdown = buildPeriodBuckets(period).map((bucket) => {
      const inBucket = (t: (typeof transactions)[number]) =>
        t.createdAt >= bucket.start && t.createdAt < bucket.end;
      const bucketDeposits = deposits.filter(inBucket);
      const bucketWithdrawals = withdrawals.filter(inBucket);
      const bucketDepositTotal = sum(bucketDeposits);
      const bucketWithdrawalTotal = sum(bucketWithdrawals);
      return {
        label: bucket.label,
        deposits: bucketDepositTotal,
        withdrawals: bucketWithdrawalTotal,
        net: bucketDepositTotal - bucketWithdrawalTotal,
      };
    });

    return {
      totalDeposits,
      totalWithdrawals,
      netRevenue: totalDeposits - totalWithdrawals,
      adhaDeposits,
      fitrDeposits,
      topStateByDeposit,
      periodBreakdown,
    };
  },

  async getAllTickets(filters?: { status?: string; page?: number }) {
    const tickets = await SupportRepository.findAll(filters);
    return { tickets: tickets.map(toTicketResponse) };
  },

  async updateTicketStatus(ticketId: string, status: string, reply?: string) {
    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) throw createError("Invalid status", 400);

    const existing = await SupportRepository.findById(ticketId);
    if (!existing) throw createError("Ticket not found", 404);

    const replies = [...((existing.replies as TicketReply[]) ?? [])];
    if (reply?.trim()) {
      replies.push({
        from: "support",
        message: reply.trim(),
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await SupportRepository.update(ticketId, { status, replies });
    if (!updated) throw createError("Ticket not found", 404);
    return toTicketResponse(updated);
  },
};
