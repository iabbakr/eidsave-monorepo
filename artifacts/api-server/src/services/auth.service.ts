import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/user.repository.js";
import { WalletRepository } from "../repositories/wallet.repository.js";
import { signToken } from "../middlewares/auth.js";
import { createError } from "../middlewares/error.js";
import type { RegisterBody, LoginBody, SetPinBody, VerifyPinBody } from "../schema/auth.schema.js";

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function toUserProfile(user: Awaited<ReturnType<typeof UserRepository.findById>>) {
  if (!user) throw createError("User not found", 404);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.state
      ? { state: user.state, city: user.city ?? "", area: user.area ?? "", address: user.address ?? "" }
      : undefined,
    nextOfKin: user.nextOfKinName
      ? { name: user.nextOfKinName, phone: user.nextOfKinPhone ?? "", relationship: user.nextOfKinRelationship ?? "" }
      : undefined,
    role: user.role as "user" | "admin" | "support",
    isActive: user.isActive,
    hasPin: user.hasPin,
    savingsStreak: user.savingsStreak,
    referralCode: user.referralCode,
    profileComplete: calcProfileComplete(user),
    createdAt: user.createdAt.toISOString(),
  };
}

function calcProfileComplete(user: NonNullable<Awaited<ReturnType<typeof UserRepository.findById>>>): number {
  let score = 0;
  if (user.name) score += 20;
  if (user.email) score += 20;
  if (user.phone) score += 20;
  if (user.address) score += 20;
  if (user.nextOfKinName) score += 20;
  return score;
}

export const AuthService = {
  toUserProfile,

  async register(body: RegisterBody) {
    const existing = await UserRepository.findByEmail(body.email);
    if (existing) throw createError("Email already registered", 409);

    const passwordHash = await bcrypt.hash(body.password, 10);

    let referralCode = generateReferralCode();
    while (await UserRepository.findByReferralCode(referralCode)) {
      referralCode = generateReferralCode();
    }

    const user = await UserRepository.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      passwordHash,
      state: body.address.state,
      city: body.address.city,
      area: body.address.area,
      address: body.address.address,
      nextOfKinName: body.nextOfKin?.name,
      nextOfKinPhone: body.nextOfKin?.phone,
      nextOfKinRelationship: body.nextOfKin?.relationship,
      referralCode,
    });

    await Promise.all([
      WalletRepository.create({ userId: user.id, type: "adha" }),
      WalletRepository.create({ userId: user.id, type: "fitr" }),
    ]);

    const token = signToken(user.id, user.role);
    return { token, user: toUserProfile(user), requiresPin: !user.hasPin };
  },

  async login(body: LoginBody) {
    const user = await UserRepository.findByEmail(body.email);
    if (!user) throw createError("Invalid credentials", 401);

    if (!user.passwordHash) {
      throw createError("This account uses social sign-in. Please continue with Google or Apple.", 401);
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw createError("Invalid credentials", 401);

    if (!user.isActive) throw createError("Account suspended", 403);

    const token = signToken(user.id, user.role);
    return { token, user: toUserProfile(user), requiresPin: !user.hasPin };
  },

  async setPin(userId: string, body: SetPinBody) {
    const pinHash = await bcrypt.hash(body.pin, 10);
    await UserRepository.update(userId, { hasPin: true, pinHash });
    return { message: "PIN set successfully" };
  },

  async verifyPin(userId: string, body: VerifyPinBody) {
    const user = await UserRepository.findById(userId);
    if (!user?.pinHash) throw createError("PIN not set", 400);

    const valid = await bcrypt.compare(body.pin, user.pinHash);
    if (!valid) throw createError("Incorrect PIN", 401);

    return { message: "PIN verified" };
  },
};