import { WalletRepository } from "../repositories/wallet.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { EidRepository } from "../repositories/eid.repository.js";
import { EmailService } from "./emailService.js";
import {
  XpressService,
  XpressApiError,
  toHttpError,
  quoteTransferFee,
  type XpressTx,
} from "./xpress.service.js";
import { withLock } from "../lib/idempotencyLock.js";
import { createError } from "../middlewares/error.js";
import { logger } from "../lib/logger.js";
import { limitsFor } from "../lib/kycTiers.js";
import type { WithdrawBody } from "../schema/wallet.schema.js";

type TxRow = Awaited<ReturnType<typeof TransactionRepository.findByReference>>;
type WalletRow = Awaited<ReturnType<typeof WalletRepository.findByUserAndType>>;

function genRef(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Midnight in Lagos (UTC+1, no DST) as a UTC Date - the "day" for daily limits. */
function startOfLagosDay(now = new Date()): Date {
  const WAT = 60 * 60 * 1000;
  return new Date(Math.floor((now.getTime() + WAT) / 86_400_000) * 86_400_000 - WAT);
}

/**
 * Only genuine inbound bank transfers to the user's virtual account count as deposits.
 * Merchant credits, wallet-to-wallet moves, reversals etc. must NOT be treated as user deposits.
 * Confirm the category string against a real sandbox transfer (see notes).
 */
const DEPOSIT_CATEGORIES = new Set([
  "WALLET_FUNDED_THROUGH_BANK_TRANSFER",
  ...(process.env["XPRESS_EXTRA_DEPOSIT_CATEGORIES"] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
]);

function isDepositCredit(tx: XpressTx): boolean {
  const settled = tx.status ? tx.status === "success" : tx.completed === true;
  return tx.type === "CREDIT" && settled && DEPOSIT_CATEGORIES.has(tx.category);
}

async function getWithdrawalWindow(type: "adha" | "fitr"): Promise<{ opensAt: Date | null; closesAt: Date | null }> {
  const cycle = await EidRepository.findActiveCycleByType(type);
  if (!cycle) return { opensAt: null, closesAt: null };

  const opensAt = new Date(cycle.withdrawalUnlockDate);
  const closesAt = new Date(cycle.eidDate);
  closesAt.setDate(closesAt.getDate() + 7);

  return { opensAt, closesAt };
}

function toWalletResponse(wallet: WalletRow, window: { opensAt: Date | null; closesAt: Date | null }) {
  if (!wallet) throw createError("Wallet not found", 404);
  const balance = parseFloat(wallet.balance as string);
  const target = wallet.targetAmount ? parseFloat(wallet.targetAmount as string) : null;
  const now = new Date();

  const isWithdrawalOpen =
    !!window.opensAt && !!window.closesAt && now >= window.opensAt && now <= window.closesAt;

  return {
    id: wallet.id,
    userId: wallet.userId,
    type: wallet.type as "adha" | "fitr",
    balance,
    mode: wallet.mode as "withdraw" | "purchase" | "group" | "individual",
    selectedAnimalId: wallet.selectedAnimalId ?? null,
    selectedAnimalSize: wallet.selectedAnimalSize ?? null,
    lockedToPurchase: wallet.lockedToPurchase,
    withdrawalUnlockedAt: window.opensAt?.toISOString() ?? null,
    isWithdrawalOpen,
    targetAmount: target,
    progressPercent: target ? Math.min((balance / target) * 100, 100) : 0,
    cycleId: wallet.cycleId ?? "",
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

function toTxResponse(tx: TxRow) {
  if (!tx) throw createError("Transaction not found", 404);
  return {
    id: tx.id,
    userId: tx.userId,
    type: tx.type as "deposit" | "withdrawal" | "purchase" | "delivery_fee",
    amount: parseFloat(tx.amount as string),
    walletType: tx.walletType as "adha" | "fitr",
    status: tx.status as "pending" | "success" | "failed",
    reference: tx.reference,
    createdAt: tx.createdAt.toISOString(),
  };
}

export const WalletService = {
  toTxResponse,
  toWalletResponse,
  getWithdrawalWindow,

  async getWallet(userId: string, type: "adha" | "fitr") {
    const wallet = await WalletRepository.findByUserAndType(userId, type);
    if (!wallet) throw createError("Wallet not found", 404);
    const window = await getWithdrawalWindow(type);
    return toWalletResponse(wallet, window);
  },

  // ---------------------------------------------------------------------
  // Deposits (bank transfer into the user's Providus virtual account)
  // ---------------------------------------------------------------------

  async getDepositAccount(userId: string, type: "adha" | "fitr") {
    const user = await UserRepository.findById(userId);
    if (!user) throw createError("User not found", 404);
    if (user.kycStatus !== "verified" || !user.virtualAccountNumber) {
      throw createError("Complete identity verification to get your deposit account", 403);
    }

    // Transfers carry no wallet info, so we remember which wallet the user last chose.
    if (user.depositTargetWallet !== type) {
      await UserRepository.update(userId, { depositTargetWallet: type });
    }

    return {
      walletType: type,
      bankName: user.virtualBankName ?? "Providus Bank",
      accountNumber: user.virtualAccountNumber,
      accountName: user.virtualAccountName ?? user.name,
    };
  },

  /**
   * Pulls inbound credits from Xpress and credits the ledger. Safe to call from the client,
   * the webhook and the cron job at the same time: each Xpress credit maps to one unique
   * `XPW-<xpress reference>` row, inserted atomically with the balance bump.
   */
  async syncDeposits(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user?.xpressCustomerId) return { credited: [] as { amount: number; reference: string; walletType: "adha" | "fitr" }[], totalCredited: 0 };

    let credits: XpressTx[];
    try {
      credits = await XpressService.listRecentCredits(user.xpressCustomerId);
    } catch (err) {
      throw toHttpError(err, "Couldn't check for deposits right now");
    }

    const target: "adha" | "fitr" = user.depositTargetWallet === "fitr" ? "fitr" : "adha";
    const wallet = await WalletRepository.findByUserAndType(user.id, target);
    if (!wallet) throw createError("Wallet not found", 404);

    const credited: { amount: number; reference: string; walletType: "adha" | "fitr" }[] = [];

    const ordered = credits
      .filter(isDepositCredit)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const c of ordered) {
      const amount = Number(c.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const reference = `XPW-${c.reference}`;
      const inserted = await WalletRepository.creditFromDeposit({
        walletId: wallet.id,
        userId: user.id,
        walletType: target,
        amount,
        reference,
        meta: { provider: "xpress", xpressReference: c.reference, xpressTxId: c.id, category: c.category },
      });
      if (inserted) credited.push({ amount, reference, walletType: target });
    }

    for (const c of credited) {
      void EmailService.sendReceipt({
        toEmail: user.email,
        customerName: user.name,
        type: "deposit",
        amount: c.amount,
        walletType: c.walletType,
        reference: c.reference,
        date: new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      }).catch((err: unknown) => logger.warn({ err, reference: c.reference }, "Deposit receipt email failed"));
    }

    return { credited, totalCredited: round2(credited.reduce((s, c) => s + c.amount, 0)) };
  },

  // ---------------------------------------------------------------------
  // Withdrawals (bank transfer out of the user's Xpress wallet)
  // ---------------------------------------------------------------------

  async withdraw(userId: string, type: "adha" | "fitr", body: WithdrawBody) {
    const user = await UserRepository.findById(userId);
    if (!user) throw createError("User not found", 404);
    if (user.kycStatus !== "verified" || !user.xpressCustomerId) {
      throw createError("Verify your identity (BVN) before withdrawing", 403);
    }
    const customerId = user.xpressCustomerId;

    const wallet = await WalletRepository.findByUserAndType(userId, type);
    if (!wallet) throw createError("Wallet not found", 404);

    const window = await getWithdrawalWindow(type);
    const now = new Date();

    if (!window.opensAt || !window.closesAt) {
      throw createError("No active withdrawal window is configured for this Eid", 403);
    }
    if (now < window.opensAt) {
      throw createError(
        `Withdrawals open on ${window.opensAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`,
        403,
      );
    }
    if (now > window.closesAt) {
      throw createError("The withdrawal window for this Eid has closed", 403);
    }
    if (wallet.lockedToPurchase) {
      throw createError("This wallet is locked to purchase only", 403);
    }

    // Never trust a client-supplied account name: resolve it from the bank.
    let accountName: string;
    try {
      accountName = (await XpressService.resolveAccount(body.bankCode, body.accountNumber)).accountName;
    } catch (err) {
      throw toHttpError(err, "Couldn't verify that bank account right now");
    }

    const fee = quoteTransferFee(body.amount);

    const result = await withLock(`withdraw:${wallet.id}`, async () => {
      const freshWallet = await WalletRepository.findByUserAndType(userId, type);
      if (!freshWallet) throw createError("Wallet not found", 404);

      const balance = parseFloat(freshWallet.balance as string);
      if (body.amount + fee > balance) {
        throw createError(`Insufficient balance - a ₦${fee.toFixed(2)} transfer fee applies`, 400);
      }

      // Friendly pre-check; Xpress remains the authority on the real daily limit.
      const { dailyLimit } = limitsFor(user.kycTier);
      const usedToday = await TransactionRepository.sumWithdrawalsSince(userId, startOfLagosDay());
      if (usedToday + body.amount > dailyLimit) {
        const left = Math.max(0, dailyLimit - usedToday);
        throw createError(
          `Your daily withdrawal limit is ₦${dailyLimit.toLocaleString("en-NG")}. You can withdraw up to ₦${left.toLocaleString("en-NG")} more today.`,
          400,
        );
      }

      const reference = genRef("WD");

      // Reserve amount + estimated fee up-front so a concurrent request can't spend it.
      await WalletRepository.updateBalance(freshWallet.id, round2(balance - body.amount - fee).toFixed(2), userId, type);

      const tx = await TransactionRepository.create({
        userId,
        type: "withdrawal",
        amount: body.amount.toString(),
        walletType: type,
        status: "pending",
        reference,
        meta: {
          provider: "xpress",
          bankCode: body.bankCode,
          accountNumber: body.accountNumber,
          accountName,
          fee,
        },
      });

      let response;
      try {
        response = await XpressService.transferToBank({
          amount: body.amount,
          sortCode: body.bankCode,
          accountNumber: body.accountNumber,
          accountName,
          narration: "EidSave withdrawal",
          customerId,
          // Echoed back in Xpress transaction metadata - lets you reconcile an unknown outcome by hand.
          metadata: { eidsaveReference: reference },
        });
      } catch (err) {
        if (err instanceof XpressApiError && !err.definite) {
          // Timeout / 5xx: the money may have left. Do NOT refund; leave pending for reconciliation.
          logger.error({ err, reference, userId }, "Withdrawal outcome UNKNOWN - left pending, check Xpress by metadata.eidsaveReference");
          return tx;
        }
        // Definite rejection: nothing moved, safe to release the reservation.
        await WalletRepository.updateBalance(freshWallet.id, balance.toFixed(2), userId, type);
        await TransactionRepository.updateStatus(reference, "failed");
        throw toHttpError(err, "Withdrawal failed. Please try again.");
      }

      const transfer = response.transfer;
      if (!transfer) {
        // Accepted but not executed (e.g. awaiting merchant approval). Keep the reservation.
        logger.warn({ reference, message: response.message }, "Xpress accepted withdrawal without executing it - pending");
        return tx;
      }

      const actualFee = Number.isFinite(transfer.total) ? round2((transfer.total as number) - transfer.amount) : fee;
      await TransactionRepository.updateMeta(reference, {
        xpressReference: transfer.reference,
        sessionId: transfer.sessionId,
        fee: actualFee,
      });
      await TransactionRepository.updateStatus(reference, "success");

      if (Math.abs(actualFee - fee) >= 0.01) {
        const current = await WalletRepository.findByUserAndType(userId, type);
        if (current) {
          const adjusted = round2(parseFloat(current.balance as string) + fee - actualFee).toFixed(2);
          await WalletRepository.updateBalance(current.id, adjusted, userId, type);
        }
      }

      return (await TransactionRepository.findByReference(reference)) ?? tx;
    });

    if (!result) {
      throw createError("A withdrawal is already being processed for this wallet - please wait a moment", 409);
    }

    return toTxResponse(result);
  },

  /** For a reconciliation path that resolves a pending withdrawal (manual/admin or a future job). */
  async resolveTransferOutcome(reference: string, outcome: "success" | "failed"): Promise<void> {
    const tx = await TransactionRepository.findByReference(reference);
    if (!tx || tx.type !== "withdrawal") return;
    if (tx.status !== "pending") return;

    await withLock(`withdraw-resolve:${reference}`, async () => {
      const fresh = await TransactionRepository.findByReference(reference);
      if (!fresh || fresh.status !== "pending") return;

      if (outcome === "success") {
        await TransactionRepository.updateStatus(reference, "success");
        return;
      }

      const wallet = await WalletRepository.findByUserAndType(
        fresh.userId,
        fresh.walletType as "adha" | "fitr",
      );
      if (wallet) {
        const fee = Number((fresh.meta as Record<string, unknown> | null)?.["fee"] ?? 0) || 0;
        const refunded = round2(parseFloat(wallet.balance as string) + parseFloat(fresh.amount as string) + fee).toFixed(2);
        await WalletRepository.updateBalance(wallet.id, refunded, fresh.userId, fresh.walletType);
      }
      await TransactionRepository.updateStatus(reference, "failed");
      logger.warn({ reference }, "Withdrawal failed/reversed - funds (incl. fee) refunded to wallet");
    });
  },

  async getTransactions(userId: string, type: "adha" | "fitr", page: number, limit: number) {
    const { transactions, total } = await TransactionRepository.findByUserAndWallet(userId, type, page, limit);
    return {
      transactions: transactions.map((tx) => toTxResponse(tx)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },
};