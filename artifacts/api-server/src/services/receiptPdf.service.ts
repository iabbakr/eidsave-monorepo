import { logger } from "../lib/logger.js";

export interface ReceiptData {
  reference: string;
  transactionType: "deposit" | "withdrawal" | "purchase";
  customerName: string;
  customerEmail: string;
  amount: number;
  walletType: "adha" | "fitr";
  date: string;
  description?: string;
}

export const ReceiptPdfService = {
  generateReceiptHtml(data: ReceiptData): string {
    const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${data.reference}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; }
          .header { text-align: center; border-bottom: 2px solid #1A6B3A; padding-bottom: 20px; }
          .logo { font-size: 26px; font-weight: bold; color: #1A6B3A; letter-spacing: 1px; }
          .receipt-title { font-size: 16px; color: #6B6357; margin-top: 4px; text-transform: uppercase; }
          .content { margin-top: 30px; }
          .amount-box { background-color: #F8F6F1; border: 1px solid #DDD6C8; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px; }
          .amount-label { font-size: 13px; color: #6B6357; text-transform: uppercase; }
          .amount-val { font-size: 32px; font-weight: bold; color: #1A6B3A; margin-top: 6px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table td { padding: 12px 8px; border-bottom: 1px solid #EDE8DE; font-size: 14px; }
          .table td.label { color: #6B6357; width: 40%; }
          .table td.val { font-weight: 600; text-align: right; }
          .footer { text-align: center; font-size: 12px; color: #9BA89F; margin-top: 50px; border-top: 1px solid #EDE8DE; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">EidSave</div>
          <div class="receipt-title">Official Transaction Receipt</div>
        </div>
        <div class="content">
          <div class="amount-box">
            <div class="amount-label">Total Amount Processed</div>
            <div class="amount-val">${formatNaira(data.amount)}</div>
          </div>
          <table class="table">
            <tr><td class="label">Reference Number</td><td class="val">${data.reference}</td></tr>
            <tr><td class="label">Customer Name</td><td class="val">${data.customerName}</td></tr>
            <tr><td class="label">Account / Email</td><td class="val">${data.customerEmail}</td></tr>
            <tr><td class="label">Transaction Type</td><td class="val">${data.transactionType.toUpperCase()}</td></tr>
            <tr><td class="label">Target Wallet</td><td class="val">${data.walletType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}</td></tr>
            <tr><td class="label">Transaction Date</td><td class="val">${data.date}</td></tr>
            <tr><td class="label">Status</td><td class="val" style="color: #2D9E5A;">SUCCESSFUL</td></tr>
          </table>
        </div>
        <div class="footer">
          Thank you for planning your sacrifice with EidSave.<br />
          For support, contact support@eidsave.ng
        </div>
      </body>
      </html>
    `;
  },
};