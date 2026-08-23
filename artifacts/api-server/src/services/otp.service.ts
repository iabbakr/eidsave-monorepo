import { cacheGet, cacheSet, cacheDel, cacheKey } from "../lib/cache.js";
import { createError } from "../middlewares/error.js";
import { logger } from "../lib/logger.js";

// ── Why Redis and not the users table ──────────────────────────────────────
// Email verification for signup happens BEFORE the user row exists (we
// don't want to create an account until the email is confirmed). So the
// OTP code, attempt count, and the "this email is verified" flag all live
// in Redis, keyed by the raw email address, with a TTL. Nothing here
// touches Postgres.

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes to enter the code
const VERIFIED_TTL_SECONDS = 30 * 60; // verified-token window to complete registration
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function otpKey(email: string) {
  return cacheKey("otp", "code", email.toLowerCase());
}
function attemptsKey(email: string) {
  return cacheKey("otp", "attempts", email.toLowerCase());
}
function cooldownKey(email: string) {
  return cacheKey("otp", "cooldown", email.toLowerCase());
}
function verifiedKey(email: string) {
  return cacheKey("otp", "verified", email.toLowerCase());
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    logger.warn({ email }, "RESEND_API_KEY not set — OTP email not sent, check server logs for code");
    logger.info({ email, code }, "DEV OTP CODE");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EidSave <noreply@eidsave.app>",
      to: email,
      subject: "Verify your EidSave email",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <h2 style="color:#1A6B3A">EidSave</h2>
          <p>Your verification code is:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p>
          <p style="color:#6B6357;font-size:13px">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body }, "Resend OTP email failed");
    throw createError("Failed to send verification email", 502);
  }
}

export const OtpService = {
  async sendVerification(email: string): Promise<{ success: boolean }> {
    const cooldown = await cacheGet<boolean>(cooldownKey(email));
    if (cooldown) {
      throw createError("Please wait before requesting another code", 429);
    }

    const code = generateCode();
    await cacheSet(otpKey(email), code, OTP_TTL_SECONDS);
    await cacheSet(cooldownKey(email), true, RESEND_COOLDOWN_SECONDS);
    await cacheDel(attemptsKey(email));

    await sendOtpEmail(email, code);

    return { success: true };
  },

  async verify(email: string, code: string): Promise<{ success: boolean }> {
    const attempts = (await cacheGet<number>(attemptsKey(email))) ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      throw createError("Too many attempts. Request a new code.", 429);
    }

    const stored = await cacheGet<string>(otpKey(email));
    if (!stored) {
      throw createError("Code expired. Please request a new one.", 400);
    }

    if (stored !== code) {
      await cacheSet(attemptsKey(email), attempts + 1, OTP_TTL_SECONDS);
      throw createError("Incorrect or expired code. Please try again.", 400);
    }

    await cacheDel(otpKey(email));
    await cacheDel(attemptsKey(email));
    // Mark this email as verified for a window long enough to finish the
    // rest of the signup form. Consumed (deleted) by AuthService.register().
    await cacheSet(verifiedKey(email), true, VERIFIED_TTL_SECONDS);

    return { success: true };
  },

  /** Called by AuthService.register() — does NOT delete the flag, since the
   *  caller (register) is responsible for consuming it atomically once the
   *  account is actually created. */
  async isVerified(email: string): Promise<boolean> {
    return !!(await cacheGet<boolean>(verifiedKey(email)));
  },

  async consumeVerified(email: string): Promise<void> {
    await cacheDel(verifiedKey(email));
  },
};
