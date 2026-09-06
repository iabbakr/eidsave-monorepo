import { Resend } from "resend";
import { logger } from "../lib/logger.js";
import { createError } from "../middlewares/error.js";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  logger.warn("RESEND_API_KEY is not set");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (!resend) {
    logger.warn(
      { email },
      "RESEND_API_KEY not set — OTP email not sent"
    );

    // Only useful during development.
    logger.info({ email, code }, "DEV OTP CODE");
    return;
  }

  try {
    logger.info(
      { email },
      "Sending verification OTP email"
    );

    const { data, error } = await resend.emails.send({
      from: "EidSave <noreply@mail.elitehubng.com>",
      to: [email],
      subject: "Verify your EidSave email",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
          <div style="
            max-width:420px;
            margin:0 auto;
            background:#ffffff;
            padding:30px;
            border-radius:12px;
          ">
            <h2 style="color:#1A6B3A;margin-top:0;">
              EidSave
            </h2>

            <p>Your verification code is:</p>

            <div style="
              text-align:center;
              margin:30px 0;
            ">
              <span style="
                display:inline-block;
                padding:16px 24px;
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

            <p style="color:#6B6357;font-size:13px;">
              This code expires in 10 minutes.
            </p>

            <p style="color:#6B6357;font-size:13px;">
              If you didn't request this verification code,
              you can safely ignore this email.
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
