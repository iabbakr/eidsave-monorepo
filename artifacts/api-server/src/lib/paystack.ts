import crypto from "crypto";
import { logger } from "./logger.js";
import { createError } from "../middlewares/error.js";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface InitializePaymentParams {
  email: string;
  amountInKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: string;
  reference: string;
  amount: number;
  gateway_response: string;
  paid_at: string;
  channel: string;
  currency: string;
  customer: {
    email: string;
    customer_code: string;
  };
}

interface PaystackApiResponse<T = unknown> {
  status: boolean;
  message?: string;
  data?: T;
}

export const PaystackClient = {
  async initializePayment(params: InitializePaymentParams): Promise<PaystackInitResponse> {
    try {
      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amountInKobo,
          reference: params.reference,
          callback_url: params.callbackUrl || "eidsave://payment-callback",
          metadata: params.metadata,
        }),
      });

      const data = (await response.json()) as PaystackApiResponse<PaystackInitResponse>;
      if (!data.status || !data.data) {
        logger.error({ data }, "Paystack initialize error");
        throw new Error(data.message || "Failed to initialize transaction");
      }

      return data.data;
    } catch (err) {
      logger.error({ err }, "Paystack initialization network error");
      throw createError("Payment gateway initialization failed", 502);
    }
  },

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    try {
      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as PaystackApiResponse<PaystackVerifyResponse>;
      if (!data.status || !data.data) {
        logger.error({ data, reference }, "Paystack verify rejection");
        throw new Error(data.message || "Failed to verify transaction");
      }

      return data.data;
    } catch (err) {
      logger.error({ err, reference }, "Paystack verification network error");
      throw createError("Payment verification could not be completed", 502);
    }
  },

  verifySignature(rawBody: string, signature: string): boolean {
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(rawBody)
      .digest("hex");
    return hash === signature;
  },
};