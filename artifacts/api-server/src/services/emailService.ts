import { logger } from "../lib/logger.js";

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
  async sendReceipt(payload: TransactionReceiptPayload): Promise<boolean> {
    try {
      const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

      logger.info(
        {
          recipient: payload.toEmail,
          ref: payload.reference,
          type: payload.type,
          amount: payload.amount,
        },
        `[EMAIL DISPATCH] Receipt generated for ${payload.type.toUpperCase()}`
      );

      // Integrates with your transactional provider (Resend, SendGrid, or Postmark)
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "EidSave <noreply@elitehubng.com>",
            to: payload.toEmail,
            subject: `Official Receipt: ${payload.type.toUpperCase()} of ${formatNaira(payload.amount)} [${payload.reference}]`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 24px; color: #1A1A1A;">
                <h2 style="color: #1A6B3A;">EidSave Official Receipt</h2>
                <p>Dear ${payload.customerName},</p>
                <p>Your transaction has been processed successfully.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #EEE;">Reference:</td><td style="padding: 8px; border-bottom: 1px solid #EEE;"><strong>${payload.reference}</strong></td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #EEE;">Amount:</td><td style="padding: 8px; border-bottom: 1px solid #EEE;"><strong>${formatNaira(payload.amount)}</strong></td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #EEE;">Wallet:</td><td style="padding: 8px; border-bottom: 1px solid #EEE;">${payload.walletType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #EEE;">Date:</td><td style="padding: 8px; border-bottom: 1px solid #EEE;">${payload.date}</td></tr>
                </table>
              </div>
            `,
          }),
        });
      }
      return true;
    } catch (err) {
      logger.error({ err, reference: payload.reference }, "Failed to send email receipt");
      return false;
    }
  },
};