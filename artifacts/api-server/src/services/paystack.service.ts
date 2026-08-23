import { createError } from "../middlewares/error.js";
import { logger } from "../lib/logger.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw createError("Payment gateway is not configured (missing PAYSTACK_SECRET_KEY)", 500);
  }
  return key;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const secretKey = getSecretKey();

  let res: Response;
  try {
    res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (err) {
    logger.error({ err, path }, "Paystack request failed to reach the network");
    throw createError("Could not reach payment gateway. Please try again shortly.", 502);
  }

  let body: PaystackEnvelope<T> | null = null;
  try {
    body = (await res.json()) as PaystackEnvelope<T>;
  } catch {
    // Non-JSON response (rare, usually an upstream outage page)
  }

  if (!res.ok || !body?.status) {
    const message = body?.message ?? `Paystack request failed with status ${res.status}`;
    logger.warn({ path, status: res.status, message }, "Paystack API returned an error");
    throw createError(message, res.status >= 400 && res.status < 500 ? 400 : 502);
  }

  return body.data;
}

// ---------------------------------------------------------------------------
// Transactions (deposits)
// ---------------------------------------------------------------------------

export interface InitializeTransactionParams {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface VerifyTransactionResult {
  status: "success" | "failed" | "abandoned" | string;
  reference: string;
  amount: number; // kobo
  currency: string;
  paid_at: string | null;
  customer: { email: string };
  gateway_response: string;
}

export const PaystackService = {
  async initializeTransaction(
    params: InitializeTransactionParams,
  ): Promise<InitializeTransactionResult> {
    // Paystack expects the smallest currency unit (kobo), not naira.
    const amountKobo = Math.round(params.amountNaira * 100);

    return paystackFetch<InitializeTransactionResult>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });
  },

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    return paystackFetch<VerifyTransactionResult>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET" },
    );
  },

  // -------------------------------------------------------------------------
  // Banks & account resolution (withdrawal flow)
  // -------------------------------------------------------------------------

  async listBanks(): Promise<Array<{ name: string; code: string; slug: string }>> {
    return paystackFetch<Array<{ name: string; code: string; slug: string }>>(
      "/bank?country=nigeria&currency=NGN",
      { method: "GET" },
    );
  },

  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ account_number: string; account_name: string }> {
    return paystackFetch<{ account_number: string; account_name: string }>(
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { method: "GET" },
    );
  },

  // -------------------------------------------------------------------------
  // Transfers (withdrawals)
  // -------------------------------------------------------------------------

  async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
  }): Promise<{ recipient_code: string }> {
    return paystackFetch<{ recipient_code: string }>("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({
        type: "nuban",
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: "NGN",
      }),
    });
  },

  async initiateTransfer(params: {
    amountNaira: number;
    recipientCode: string;
    reason: string;
    reference: string;
  }): Promise<{ transfer_code: string; status: string; reference: string }> {
    const amountKobo = Math.round(params.amountNaira * 100);

    const result = await paystackFetch<{ transfer_code: string; status: string; reference: string }>(
      "/transfer",
      {
        method: "POST",
        body: JSON.stringify({
          source: "balance",
          amount: amountKobo,
          recipient: params.recipientCode,
          reason: params.reason,
          reference: params.reference,
        }),
      },
    );

    // Some Paystack account configurations require OTP finalization for
    // transfers above a threshold. We deliberately do NOT attempt to
    // auto-finalize with a stored OTP (that would require collecting a
    // one-time code from a human admin, not something a backend job should
    // do unattended). Surface this clearly so the admin dashboard can flag
    // it for manual completion in the Paystack portal instead of silently
    // leaving the user's wallet debited with no transfer actually sent.
    if (result.status === "otp") {
      logger.error(
        { reference: params.reference, transferCode: result.transfer_code },
        "Paystack transfer requires OTP finalization — needs manual admin action in the Paystack dashboard",
      );
    }

    return result;
  },

  async verifyTransfer(reference: string): Promise<{ status: string; reference: string }> {
    return paystackFetch<{ status: string; reference: string }>(
      `/transfer/verify/${encodeURIComponent(reference)}`,
      { method: "GET" },
    );
  },
};