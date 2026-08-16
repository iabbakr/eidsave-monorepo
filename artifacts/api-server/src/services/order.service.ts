import { AnimalRepository } from "../repositories/animal.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { WalletRepository } from "../repositories/wallet.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { createError } from "../middlewares/error.js";
import type { PlaceOrderBody } from "../schema/orders.schema.js";

const DELIVERY_FEE_PER_RECIPIENT = 2000;

function toOrderResponse(order: Awaited<ReturnType<typeof OrderRepository.findById>>) {
  if (!order) throw createError("Order not found", 404);
  return {
    id: order.id,
    userId: order.userId,
    animalId: order.animalId,
    animalName: order.animalName,
    size: order.size,
    quantity: order.quantity,
    totalPrice: parseFloat(order.totalPrice as string),
    deliveryFee: parseFloat(order.deliveryFee as string),
    recipients: order.recipients as Array<{ name: string; phone: string; address: object; deliveryFee: number }>,
    status: order.status as "pending" | "confirmed" | "dispatched" | "delivered",
    eidType: order.eidType as "adha" | "fitr",
    cycleId: order.cycleId ?? "",
    createdAt: order.createdAt.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
  };
}

export const OrderService = {
  toOrderResponse,

  async placeOrder(userId: string, body: PlaceOrderBody) {
    const animal = await AnimalRepository.findById(body.animalId);
    if (!animal) throw createError("Animal not found", 404);

    const sizeData = (animal.sizes as Array<{ label: string; weight: string; price: number }>)
      .find(s => s.label === body.size);
    if (!sizeData) throw createError("Invalid size", 400);

    const totalPrice = sizeData.price * body.quantity;
    const totalDeliveryFee = DELIVERY_FEE_PER_RECIPIENT * body.recipients.length;
    const grandTotal = totalPrice + totalDeliveryFee;

    const walletType = body.eidType === "adha" ? "adha" : "fitr";
    const wallet = await WalletRepository.findByUserAndType(userId, walletType);
    if (!wallet) throw createError("Wallet not found", 404);

    const balance = parseFloat(wallet.balance as string);
    if (balance < grandTotal) {
      throw createError(`Insufficient balance. Need ₦${grandTotal.toLocaleString("en-NG")}`, 400);
    }

    const reference = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const recipientsWithFee = body.recipients.map((r: { name: string; phone: string; address: { state: string; city: string; town?: string; street: string } }) => ({ ...r, deliveryFee: DELIVERY_FEE_PER_RECIPIENT }));

    const order = await OrderRepository.create({
      userId,
      animalId: body.animalId,
      animalName: animal.name,
      size: body.size,
      quantity: body.quantity,
      totalPrice: totalPrice.toString(),
      deliveryFee: totalDeliveryFee.toString(),
      recipients: recipientsWithFee,
      status: "pending",
      eidType: body.eidType,
      cycleId: wallet.cycleId ?? undefined,
    });

    await TransactionRepository.create({
      userId,
      type: "purchase",
      amount: grandTotal.toString(),
      walletType,
      status: "success",
      reference,
    });

    const newBalance = (balance - grandTotal).toFixed(2);
    await WalletRepository.updateBalance(wallet.id, newBalance, userId, walletType);

    return toOrderResponse(order);
  },

  async getUserOrders(userId: string) {
    const orders = await OrderRepository.findByUser(userId);
    return { orders: orders.map(toOrderResponse) };
  },

  async getOrder(orderId: string, userId: string) {
    const order = await OrderRepository.findById(orderId, userId);
    if (!order) throw createError("Order not found", 404);
    return toOrderResponse(order);
  },
};
