// NOTE: requires the `jose` package for JWKS verification.
//   pnpm --filter api add jose
import { jwtVerify, createRemoteJWKSet } from "jose";
import { UserRepository } from "../repositories/user.repository.js";
import { signToken } from "../middlewares/auth.js";
import { createError } from "../middlewares/error.js";
import type { SocialAuthBody } from "../schema/socialAuth.schema.js";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const GOOGLE_CLIENT_IDS = (process.env["GOOGLE_CLIENT_IDS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const APPLE_BUNDLE_ID = process.env["APPLE_BUNDLE_ID"] ?? "";

interface VerifiedIdentity {
  email: string;
  name?: string;
  providerUid: string;
}

async function verifyGoogleToken(idToken: string): Promise<VerifiedIdentity> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: GOOGLE_CLIENT_IDS.length ? GOOGLE_CLIENT_IDS : undefined,
  });

  if (!payload.email || typeof payload.email !== "string") {
    throw createError("Google token did not include an email", 400);
  }

  return {
    email: payload.email,
    name: typeof payload["name"] === "string" ? (payload["name"] as string) : undefined,
    providerUid: String(payload.sub),
  };
}

async function verifyAppleToken(idToken: string): Promise<VerifiedIdentity> {
  const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience: APPLE_BUNDLE_ID || undefined,
  });

  if (!payload.email || typeof payload.email !== "string") {
    throw createError(
      "Apple did not return an email for this token. Apple only sends email on the very first authorization — sign out of the app on Apple ID settings and try again.",
      400,
    );
  }

  return {
    email: payload.email,
    providerUid: String(payload.sub),
  };
}

export const SocialAuthService = {
  async authenticate(body: SocialAuthBody): Promise<{
    token: string;
    user: Awaited<ReturnType<typeof UserRepository.findByEmail>>;
    isNewUser: boolean;
    requiresPin: boolean;
  }> {
    const identity =
      body.provider === "google" ? await verifyGoogleToken(body.idToken) : await verifyAppleToken(body.idToken);

    const email = identity.email.trim().toLowerCase();
    let user = await UserRepository.findByEmail(email);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const referralCode = `EID${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      user = await UserRepository.create({
        name: body.name?.trim() || identity.name?.trim() || email.split("@")[0]!,
        email,
        phone: "",
        passwordHash: null,
        role: "user",
        isActive: true,
        hasPin: false,
        savingsStreak: 0,
        referralCode,
        emailVerified: true, // provider already verified ownership of this email
        authProvider: body.provider,
        providerUid: identity.providerUid,
        // ✅ gate: social users land in a minimal account and must complete
        // the onboarding form (address, next of kin) before using the app.
        profileSetupCompleted: false,
      } as any);
    } else if (user.authProvider === "password" && !user.providerUid) {
      // Existing password account signing in with a matching social email —
      // link the provider rather than creating a duplicate account.
      user = await UserRepository.update(user.id, {
        authProvider: body.provider,
        providerUid: identity.providerUid,
      } as any);
    }

    if (!user) {
      throw createError("Failed to create or load account", 500);
    }

    const token = signToken(user.id, user.role);

    return {
      token,
      user,
      isNewUser,
      requiresPin: !user.hasPin,
    };
  },
};
