import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, walletsTable, transactionsTable, ordersTable } from "@workspace/db/schema";
import { UserRepository } from "../repositories/user.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { AnimalService } from "./animal.service.js";
import { createError } from "../middlewares/error.js";
import { AuthService } from "./auth.service.js";

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

    const withBalances = await Promise.all(paged.map(async u => {
      const [adha, fitr] = await Promise.all([
        db.select().from(walletsTable).where(eq(walletsTable.userId, u.id)).limit(1),
        db.select({ balance: walletsTable.balance }).from(walletsTable)
          .where(eq(walletsTable.userId, u.id)).limit(2),
      ]);
      const wallets = fitr;
      return {
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        state: u.state ?? "", role: u.role, isActive: u.isActive,
        adhaBalance: adha[0] ? parseFloat(adha[0].balance as string) : 0,
        fitrBalance: wallets[1] ? parseFloat(wallets[1].balance as string) : 0,
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
};
