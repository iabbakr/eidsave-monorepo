import { Resend } from "resend";
import { cacheGet, cacheSet, cacheDel, cacheKey } from "../lib/cache.js";
import { createError } from "../middlewares/error.js";
import { logger } from "../lib/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// OTP CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const VERIFIED_TTL_SECONDS = 30 * 60; // 30 minutes to complete registration
const RESEND_COOLDOWN_SECONDS = 60; // 1 minute between OTP requests
const MAX_ATTEMPTS = 5;

// ─────────────────────────────────────────────────────────────────────────────
// RESEND CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  logger.warn("RESEND_API_KEY is not set");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = "EidSave <noreply@mail.elitehubng.com>";

// ─────────────────────────────────────────────────────────────────────────────
// REDIS KEYS
// ─────────────────────────────────────────────────────────────────────────────

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function otpKey(email: string): string {
  return cacheKey("otp", "code", normalizeEmail(email));
}

function attemptsKey(email: string): string {
  return cacheKey("otp", "attempts", normalizeEmail(email));
}

function cooldownKey(email: string): string {
  return cacheKey("otp", "cooldown", normalizeEmail(email));
}

function verifiedKey(email: string): string {
  return cacheKey("otp", "verified", normalizeEmail(email));
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SENDER
// ─────────────────────────────────────────────────────────────────────────────

async function sendOtpEmail(
  email: string,
  code: string
): Promise<void> {
  if (!resend) {
    logger.warn(
      { email },
      "RESEND_API_KEY not set — OTP email not sent"
    );

    // Development fallback.
    // Do NOT rely on this in production.
    logger.info(
      { email, code },
      "DEV OTP CODE"
    );

    return;
  }

  try {
    logger.info(
      { email },
      "Sending verification OTP email"
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: "Verify your EidSave email",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >
          <title>Verify your EidSave email</title>
        </head>

        <body style="
          margin:0;
          padding:20px;
          background:#f4f4f4;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            Roboto,
            Arial,
            sans-serif;
        ">

          <div style="
            max-width:420px;
            margin:40px auto;
            background:#ffffff;
            padding:32px;
            border-radius:12px;
            box-shadow:0 4px 20px rgba(0,0,0,0.06);
          ">

            <div style="
              text-align:center;
              margin-bottom:25px;
            ">
              <h2 style="
                color:#1A6B3A;
                margin:0;
                font-size:28px;
              ">
                EidSave
              </h2>
            </div>

            <h3 style="
              color:#222;
              margin-bottom:12px;
            ">
              Verify your email
            </h3>

            <p style="
              color:#444;
              line-height:1.6;
            ">
              Use the verification code below to complete your
              EidSave registration.
            </p>

            <div style="
              text-align:center;
              margin:30px 0;
            ">
              <span style="
                display:inline-block;
                padding:18px 28px;
                background:#f0f7f2;
                border:2px dashed #1A6B3A;
                border-radius:10px;
                color:#1A6B3A;
                font-size:32px;
                font-weight:700;
                letter-spacing:8px;
              ">
                ${code}
              </span>
            </div>

            <div style="
              background:#f8f8f8;
              padding:16px;
              border-radius:8px;
              margin:20px 0;
            ">
              <p style="
                margin:0;
                color:#666;
                font-size:13px;
                line-height:1.6;
              ">
                ⏱️ This code expires in
                <strong>10 minutes</strong>.
              </p>

              <p style="
                margin:8px 0 0;
                color:#666;
                font-size:13px;
                line-height:1.6;
              ">
                🔒 Never share this code with anyone.
                EidSave will never ask you for your OTP.
              </p>
            </div>

            <p style="
              color:#888;
              font-size:13px;
              line-height:1.6;
            ">
              If you didn't request this verification code,
              you can safely ignore this email.
            </p>

            <hr style="
              border:none;
              border-top:1px solid #eee;
              margin:25px 0;
            ">

            <p style="
              text-align:center;
              color:#aaa;
              font-size:11px;
              margin:0;
            ">
              © ${new Date().getFullYear()} EidSave
            </p>

          </div>

        </body>
        </html>
      `,
    });

    if (error) {
      logger.error(
        {
          email,
          error,
        },
        "Resend OTP email failed"
      );

      throw createError(
        "Failed to send verification email",
        502
      );
    }

    logger.info(
      {
        email,
        messageId: data?.id,
      },
      "Verification OTP email sent successfully"
    );
  } catch (err) {
    logger.error(
      {
        email,
        err,
      },
      "OTP email exception"
    );

    throw createError(
      "Failed to send verification email",
      502
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const OtpService = {

  /**
   * Send a new email verification OTP.
   */
  async sendVerification(
    email: string
  ): Promise<{ success: boolean }> {

    const normalizedEmail = normalizeEmail(email);

    // Prevent OTP spam.
    const cooldown = await cacheGet<boolean>(
      cooldownKey(normalizedEmail)
    );

    if (cooldown) {
      throw createError(
        "Please wait before requesting another code",
        429
      );
    }

    // Generate a new six-digit OTP.
    const code = generateCode();

    // Store OTP in Redis.
    await cacheSet(
      otpKey(normalizedEmail),
      code,
      OTP_TTL_SECONDS
    );

    // Start resend cooldown.
    await cacheSet(
      cooldownKey(normalizedEmail),
      true,
      RESEND_COOLDOWN_SECONDS
    );

    // Reset failed-attempt counter.
    await cacheDel(
      attemptsKey(normalizedEmail)
    );

    // Send email.
    await sendOtpEmail(
      normalizedEmail,
      code
    );

    return {
      success: true,
    };
  },

  /**
   * Verify an OTP entered by the user.
   */
  async verify(
    email: string,
    code: string
  ): Promise<{ success: boolean }> {

    const normalizedEmail = normalizeEmail(email);

    const cleanCode = code.trim();

    // Check failed attempts.
    const attempts =
      (await cacheGet<number>(
        attemptsKey(normalizedEmail)
      )) ?? 0;

    if (attempts >= MAX_ATTEMPTS) {
      throw createError(
        "Too many attempts. Request a new code.",
        429
      );
    }

    // Retrieve stored OTP.
    const stored =
      await cacheGet<string>(
        otpKey(normalizedEmail)
      );

    if (!stored) {
      throw createError(
        "Code expired. Please request a new one.",
        400
      );
    }

    // Compare OTP.
    if (stored !== cleanCode) {

      await cacheSet(
        attemptsKey(normalizedEmail),
        attempts + 1,
        OTP_TTL_SECONDS
      );

      const remainingAttempts =
        MAX_ATTEMPTS - (attempts + 1);

      if (remainingAttempts <= 0) {
        throw createError(
          "Too many attempts. Request a new code.",
          429
        );
      }

      throw createError(
        "Incorrect or expired code. Please try again.",
        400
      );
    }

    // OTP is correct.
    await cacheDel(
      otpKey(normalizedEmail)
    );

    await cacheDel(
      attemptsKey(normalizedEmail)
    );

    // Mark email as verified temporarily.
    //
    // This allows the user to continue the registration
    // process even though the user row does not exist yet.
    await cacheSet(
      verifiedKey(normalizedEmail),
      true,
      VERIFIED_TTL_SECONDS
    );

    logger.info(
      {
        email: normalizedEmail,
      },
      "Email verification OTP accepted"
    );

    return {
      success: true,
    };
  },

  /**
   * Check whether an email has recently passed verification.
   *
   * Used by AuthService.register().
   */
  async isVerified(
    email: string
  ): Promise<boolean> {

    const normalizedEmail = normalizeEmail(email);

    const verified =
      await cacheGet<boolean>(
        verifiedKey(normalizedEmail)
      );

    return !!verified;
  },

  /**
   * Consume the temporary verified flag after
   * the user account has successfully been created.
   */
  async consumeVerified(
    email: string
  ): Promise<void> {

    const normalizedEmail = normalizeEmail(email);

    await cacheDel(
      verifiedKey(normalizedEmail)
    );

    logger.info(
      {
        email: normalizedEmail,
      },
      "Email verification flag consumed"
    );
  },
};
