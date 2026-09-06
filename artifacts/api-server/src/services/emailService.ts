import { Resend } from "resend";
import { logger } from "../lib/logger.js";

const resendApiKey = process.env.RESEND_API_KEY;

const resend = resendApiKey
  ? new Resend(resendApiKey)
  : null;

export interface TransactionReceiptPayload {
  toEmail: string;
  customerName: string;
  type: "deposit" | "withdrawal" | "purchase" | "delivery_fee";
  amount: number;
  walletType: "adha" | "fitr";
  reference: string;
  date: string;
  metadata?: Record<string, unknown>;
}

export const EmailService = {
  async sendReceipt(
    payload: TransactionReceiptPayload
  ): Promise<boolean> {
    try {
      const formatNaira = (n: number) =>
        "₦" +
        n.toLocaleString("en-NG", {
          minimumFractionDigits: 2,
        });

      logger.info(
        {
          recipient: payload.toEmail,
          ref: payload.reference,
          type: payload.type,
          amount: payload.amount,
        },
        `[EMAIL DISPATCH] Sending ${payload.type.toUpperCase()} receipt`
      );

      if (!resend) {
        logger.warn(
          "RESEND_API_KEY is not configured"
        );

        return false;
      }

      const { data, error } = await resend.emails.send({
        from: "EidSave <noreply@mail.elitehubng.com>",
        to: [payload.toEmail],

        subject:
          `Official Receipt: ${payload.type.toUpperCase()} ` +
          `of ${formatNaira(payload.amount)} ` +
          `[${payload.reference}]`,

        html: `
          <!DOCTYPE html>
          <html>
          <body style="
            margin:0;
            padding:20px;
            background:#f4f4f4;
            font-family:Arial,sans-serif;
          ">

            <div style="
              max-width:600px;
              margin:0 auto;
              background:#ffffff;
              padding:30px;
              border-radius:12px;
            ">

              <h2 style="color:#1A6B3A;">
                EidSave Official Receipt
              </h2>

              <p>
                Dear ${payload.customerName},
              </p>

              <p>
                Your transaction has been processed successfully.
              </p>

              <table style="
                width:100%;
                border-collapse:collapse;
                margin-top:20px;
              ">
                <tr>
                  <td style="padding:10px;border-bottom:1px solid #eee;">
                    Reference
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #eee;">
                    <strong>${payload.reference}</strong>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px;border-bottom:1px solid #eee;">
                    Amount
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #eee;">
                    <strong>${formatNaira(payload.amount)}</strong>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px;border-bottom:1px solid #eee;">
                    Wallet
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #eee;">
                    ${
                      payload.walletType === "adha"
                        ? "Eid al-Adha"
                        : "Eid al-Fitr"
                    }
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px;border-bottom:1px solid #eee;">
                    Date
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #eee;">
                    ${payload.date}
                  </td>
                </tr>
              </table>

            </div>

          </body>
          </html>
        `,
      });

      if (error) {
        logger.error(
          {
            error,
            reference: payload.reference,
            recipient: payload.toEmail,
          },
          "Resend receipt failed"
        );

        return false;
      }

      logger.info(
        {
          messageId: data?.id,
          reference: payload.reference,
          recipient: payload.toEmail,
        },
        "Transaction receipt email sent successfully"
      );

      return true;
    } catch (err) {
      logger.error(
        {
          err,
          reference: payload.reference,
        },
        "Failed to send email receipt"
      );

      return false;
    }
  },
};
