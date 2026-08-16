import { UserRepository } from "../repositories/user.repository.js";
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
      updates["town"] = body.address.town;
      updates["street"] = body.address.street;
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
};
