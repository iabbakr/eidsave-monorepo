import { UserRepository } from "../repositories/user.repository.js";
import { WalletRepository } from "../repositories/wallet.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { createError } from "../middlewares/error.js";
import { AuthService } from "./auth.service.js";
import type { UpdateProfileBody, PushTokenBody } from "../schema/user.schema.js";

export const UserService = {
  async getProfile(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw createError("User not found", 404);
    return AuthService.toUserProfile(user);
  },

  async updateProfile(userId: string, body: UpdateProfileBody) {
    const updates: Record<string, unknown> = {};
    if (body.name) updates["name"] = body.name;
    if (body.phone) updates["phone"] = body.phone;
    if (body.address) {
      updates["state"] = body.address.state;
      updates["city"] = body.address.city;
      updates["area"] = body.address.area;
      updates["address"] = body.address.address;
    }
    if (body.nextOfKin) {
      updates["nextOfKinName"] = body.nextOfKin.name;
      updates["nextOfKinPhone"] = body.nextOfKin.phone;
      updates["nextOfKinRelationship"] = body.nextOfKin.relationship;
    }

    const user = await UserRepository.update(userId, updates);
    if (!user) throw createError("User not found", 404);
    return AuthService.toUserProfile(user);
  },

  async savePushToken(userId: string, body: PushTokenBody) {
    await UserRepository.update(userId, { pushToken: body.token });
    return { message: "Push token registered" };
  },

  async uploadAvatar(userId: string, avatarUrl: string) {
    const user = await UserRepository.update(userId, { avatarUrl });
    if (!user) throw createError("User not found", 404);
    return AuthService.toUserProfile(user);
  },

  /**
   * Soft-deletes the account: allowed only when both wallets are at zero
   * balance and there is no order still in flight (anything other than
   * "delivered"). We anonymize rather than hard-delete the row because
   * orders/transactions/receipts reference users.id with no ON DELETE
   * CASCADE — a hard delete would throw a foreign key violation the moment
   * the user has any transaction history.
   */
  async deleteAccount(userId: string) {
    const wallets = await WalletRepository.findAllByUser(userId);
    const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance as string), 0);
    if (totalBalance > 0) {
      throw createError(
        "You still have funds in your wallet(s). Please withdraw your balance before deleting your account.",
        400,
      );
    }

    const orders = await OrderRepository.findByUser(userId);
    const pendingOrder = orders.find((o) => o.status !== "delivered");
    if (pendingOrder) {
      throw createError(
        "You have an order that hasn't been delivered yet. Please wait until it's delivered before deleting your account.",
        400,
      );
    }

    const user = await UserRepository.findById(userId);
    if (!user) throw createError("User not found", 404);

    const anonymizedEmail = `deleted_${userId}_${Date.now()}@eidsave.deleted`;

    await UserRepository.update(userId, {
      name: "Deleted User",
      email: anonymizedEmail,
      phone: "",
      passwordHash: null,
      pinHash: null,
      hasPin: false,
      avatarUrl: null,
      nextOfKinName: null,
      nextOfKinPhone: null,
      nextOfKinRelationship: null,
      state: null,
      city: null,
      area: null,
      address: null,
      pushToken: null,
      isActive: false,
    } as Record<string, unknown>);

    return { message: "Your account has been deleted", success: true };
  },
};