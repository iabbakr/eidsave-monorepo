import { createError } from "../middlewares/error.js";
import { cacheGet, cacheSet, cacheKey } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

const TIMEOUT_MS = 20_000;

const envNum = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

/**
 * Xpress "Transfer Outward" pricing (VAT exclusive) + stamp duty charged to the sender.
 * Boundary amounts (exactly 5,000 / 50,000) are not specified in the sheet; we round UP to the higher tier,
 * which over-reserves slightly and is corrected after the transfer from Xpress's real total.
 * Stamp duty defaults to "always" (min 0) so we never UNDER-reserve; once Xpress confirms the threshold
 * (the statutory rule is usually >= 10,000) set XPRESS_STAMP_DUTY_MIN_NGN=10000.
 */
export const FEE_SCHEDULE = {
  tiers: [
    { below: 5_000, fee: 10 },
    { below: 50_000, fee: 26 },
  ],
  topFee: 50,
  vatRate: 0.075,
  stampDuty: envNum(process.env["XPRESS_STAMP_DUTY_NGN"], 50),
  stampDutyMin: envNum(process.env["XPRESS_STAMP_DUTY_MIN_NGN"], 0),
};

export function quoteTransferFee(amount: number): number {
  const base = FEE_SCHEDULE.tiers.find((t) => amount < t.below)?.fee ?? FEE_SCHEDULE.topFee;
  const vat = base * FEE_SCHEDULE.vatRate;
  const stamp = amount >= FEE_SCHEDULE.stampDutyMin ? FEE_SCHEDULE.stampDuty : 0;
  return Math.round((base + vat + stamp) * 100) / 100;
}

/**
 * `definite` = the provider answered with a rejection, so no money moved.
 * Timeouts / network errors / 5xx are NOT definite: the transfer may or may
 * not have happened, so callers must never refund blindly on those.
 */
export class XpressApiError extends Error {
  httpStatus: number;
  definite: boolean;
  constructor(message: string, httpStatus: number, definite: boolean) {
    super(message);
    this.name = "XpressApiError";
    this.httpStatus = httpStatus;
    this.definite = definite;
  }
}

export interface XpressBank { code: string; name: string }

export interface XpressCustomerWallet {
  status: boolean;
  customer: { id: string; nameMatch?: boolean; tier?: string };
  wallet: {
    id: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    accountReference: string;
    status: string;
  };
}

export interface XpressTx {
  id: string;
  type: "CREDIT" | "DEBIT";
  category: string;
  amount: number | string;
  reference: string;
  status?: string;
  completed?: boolean;
  createdAt: string;
}

export interface XpressTransfer {
  amount: number;
  charges?: number;
  vat?: number;
  total?: number;
  reference: string;
  sessionId?: string;
  transactionReference?: string;
}

function config() {
  const baseUrl = (process.env["XPRESS_BASE_URL"] ?? "").replace(/\/+$/, "");
  const secret = process.env["XPRESS_SECRET_KEY"] ?? "";
  if (!baseUrl || !secret) throw createError("Wallet provider is not configured", 503);
  return { baseUrl, secret };
}

async function call<T>(
  method: "GET" | "POST",
  path: string,
  opts: { query?: Record<string, string | number>; body?: unknown } = {},
): Promise<T> {
  const { baseUrl, secret } = config();
  const url = new URL(`${baseUrl}${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, String(v));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    logger.error({ err, path }, "Xpress request failed before a response was received");
    throw new XpressApiError("Wallet provider unreachable", 0, false);
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }

  if (!res.ok || data?.status === false) {
    const message = typeof data?.message === "string" ? data.message : `Wallet provider error (${res.status})`;
    const definite = (res.status >= 400 && res.status < 500) || (res.ok && data?.status === false);
    logger.warn({ path, httpStatus: res.status, message }, "Xpress request rejected");
    throw new XpressApiError(message, res.status, definite);
  }
  return data as T;
}

/** Turns provider errors into safe HTTP errors. Use as `throw toHttpError(err, "fallback")`. */
export function toHttpError(err: unknown, fallback: string): unknown {
  if (err instanceof XpressApiError) {
    if (err.httpStatus === 401 || err.httpStatus === 403) {
      logger.error("Xpress rejected our credentials - check XPRESS_SECRET_KEY / sandbox vs live");
      return createError(fallback, 503);
    }
    return err.definite ? createError(err.message, 400) : createError(fallback, 503);
  }
  return err;
}

export const XpressService = {
  /** KYC: verifies the BVN and reserves a Providus virtual account for the customer. */
  createCustomerWallet(input: {
    bvn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phoneNumber: string;
    email: string;
    address: string;
    metadata?: Record<string, unknown>;
  }) {
    return call<XpressCustomerWallet>("POST", "/wallet", { body: input });
  },

  async listRecentCredits(customerId: string): Promise<XpressTx[]> {
    const out: XpressTx[] = [];
    for (let page = 1; page <= 3; page++) {
      const res = await call<{
        transactions?: XpressTx[];
        data?: XpressTx[];
        metadata?: { totalPages?: number };
      }>("GET", "/transaction/customer", {
        query: { customerId, page, perPage: 50, type: "CREDIT" },
      });
      out.push(...(res.transactions ?? res.data ?? []));
      if (page >= (res.metadata?.totalPages ?? 1)) break;
    }
    return out;
  },

  async listBanks(): Promise<XpressBank[]> {
    const k = cacheKey("xpress", "banks");
    const cached = await cacheGet<XpressBank[]>(k);
    if (cached) return cached;
    const res = await call<{ banks?: XpressBank[] }>("GET", "/transfer/banks");
    const banks = [...(res.banks ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    await cacheSet(k, banks, 86_400);
    return banks;
  },

  async resolveAccount(sortCode: string, accountNumber: string) {
    const res = await call<{ account: { accountName: string; accountNumber: string; bankCode: string } }>(
      "GET",
      "/transfer/account/details",
      { query: { sortCode, accountNumber } },
    );
    return res.account;
  },

  transferToBank(input: {
    amount: number;
    sortCode: string;
    accountNumber: string;
    accountName: string;
    narration: string;
    customerId: string;
    metadata?: Record<string, unknown>;
  }) {
    return call<{ status: boolean; message?: string; transfer?: XpressTransfer }>(
      "POST",
      "/transfer/bank/customer",
      { body: input },
    );
  },
};