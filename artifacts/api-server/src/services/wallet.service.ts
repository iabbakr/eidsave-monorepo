import { WalletRepository } from "../repositories/wallet.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { PaystackService } from "./paystack.service.js";
import { withLock } from "../lib/idempotencyLock.js";
import { createError } from "../middlewares/error.js";
import { logger } from "../lib/logger.js";
import type { DepositInitBody, DepositVerifyBody, WithdrawBody } from "../schema/wallet.schema.js";

type TxRow = Awaited<ReturnType<typeof TransactionRepository.findByReference>>;
type WalletRow = Awaited<ReturnType<typeof WalletRepository.findByUserAndType>>;

function genRef(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function toWalletResponse(wallet: WalletRow) {
  if (!wallet) throw createError("Wallet not found", 404);
  const balance = parseFloat(wallet.balance as string);
  const target = wallet.targetAmount ? parseFloat(wallet.targetAmount as string) : null;
  const now = new Date();
  return {
    id: wallet.id,
    userId: wallet.userId,
    type: wallet.type as "adha" | "fitr",
    balance,
    mode: wallet.mode as "withdraw" | "purchase" | "group" | "individual",
    selectedAnimalId: wallet.selectedAnimalId ?? null,
    selectedAnimalSize: wallet.selectedAnimalSize ?? null,
    lockedToPurchase: wallet.lockedToPurchase,
    withdrawalUnlockedAt: wallet.withdrawalUnlockedAt?.toISOString() ?? null,
    isWithdrawalOpen: wallet.withdrawalUnlockedAt ? now >= wallet.withdrawalUnlockedAt : false,
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

  async getWallet(userId: string, type: "adha" | "fitr") {
    const wallet = await WalletRepository.findByUserAndType(userId, type);
    if (!wallet) throw createError("Wallet not found", 404);
    return toWalletResponse(wallet);
  },

  // ---------------------------------------------------------------------
  // Deposits
  // ---------------------------------------------------------------------

  async initDeposit(userId: string, type: "adha" | "fitr", body: DepositInitBody) {
    const user = await UserRepository.findById(userId);
    if (!user) throw createError("User not found", 404);

    const reference = genRef("EID");

    // Create the pending transaction first so that even if the Paystack
    // call below fails, we have an auditable record of the attempt.
    await TransactionRepository.create({
      userId,
      type: "deposit",
      amount: body.amount.toString(),
      walletType: type,
      status: "pending",
      reference,
    });

    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || "eidsave://payment-callback";

    try {
      const init = await PaystackService.initializeTransaction({
        email: user.email,
        amountNaira: body.amount,
        reference,
        callbackUrl,
        metadata: { userId, walletType: type },
      });

      return {
        authorizationUrl: init.authorization_url,
        accessCode: init.access_code,
        reference: init.reference,
      };
    } catch (err) {
      await TransactionRepository.updateStatus(reference, "failed");
      throw err;
    }
  },

  /**
   * Verifies a deposit against Paystack and credits the wallet exactly once.
   * Shared by the client-triggered "verify after checkout" endpoint AND the
   * Paystack webhook, both guarded by the same lock key on `reference` so
   * whichever one arrives first wins and the other becomes a no-op.
   */
  async confirmDeposit(reference: string, opts?: { expectedUserId?: string }): Promise<NonNullable<TxRow>> {
    const initial = await TransactionRepository.findByReference(reference);
    if (!initial) throw createError("Transaction not found", 404);

    if (opts?.expectedUserId && initial.userId !== opts.expectedUserId) {
      throw createError("Transaction does not belong to this user", 403);
    }

    if (initial.status === "success") {
      return initial;
    }

    const result = await withLock(`deposit:${reference}`, async () => {
      // Re-read inside the lock — the other caller (webhook vs. client
      // verify) may have already finished processing while we were
      // waiting to acquire it.
      const fresh = await TransactionRepository.findByReference(reference);
      if (!fresh) throw createError("Transaction not found", 404);
      if (fresh.status === "success") return fresh;

      const verification = await PaystackService.verifyTransaction(reference);

      if (verification.status !== "success") {
        await TransactionRepository.updateStatus(reference, "failed");
        throw createError(`Payment was not successful (${verification.gateway_response})`, 400);
      }

      // Defense against a tampered or replayed reference: the amount
      // Paystack actually confirms must match what we recorded when the
      // transaction was created.
      const expectedKobo = Math.round(parseFloat(fresh.amount as string) * 100);
      if (verification.amount !== expectedKobo) {
        logger.error(
          { reference, expectedKobo, actualKobo: verification.amount },
          "Deposit amount mismatch between our record and Paystack — refusing to credit",
        );
        throw createError("Payment amount mismatch", 400);
      }

      const wallet = await WalletRepository.findByUserAndType(
        fresh.userId,
        fresh.walletType as "adha" | "fitr",
      );
      if (!wallet) throw createError("Wallet not found", 404);

      const newBalance = (parseFloat(wallet.balance as string) + parseFloat(fresh.amount as string)).toFixed(2);
      await WalletRepository.updateBalance(wallet.id, newBalance, fresh.userId, fresh.walletType);
      await TransactionRepository.updateStatus(reference, "success");

      const updated = await TransactionRepository.findByReference(reference);
      return updated!;
    });

    if (!result) {
      // Someone else holds the lock right now (the webhook fired while the
      // client's verify call was in flight, or vice versa). Report back
      // whatever the current state is rather than erroring outright.
      const fresh = await TransactionRepository.findByReference(reference);
      if (fresh?.status === "success") return fresh;
      throw createError("This deposit is already being processed — please check back shortly", 409);
    }

    return result;
  },

  async verifyDeposit(userId: string, type: "adha" | "fitr", body: DepositVerifyBody) {
    const tx = await this.confirmDeposit(body.reference, { expectedUserId: userId });
    if (tx.walletType !== type) {
      throw createError("Reference does not match the requested wallet type", 400);
    }
    return toTxResponse(tx);
  },

  // ---------------------------------------------------------------------
  // Withdrawals
  // ---------------------------------------------------------------------

  async withdraw(userId: string, type: "adha" | "fitr", body: WithdrawBody) {
    const wallet = await WalletRepository.findByUserAndType(userId, type);
    if (!wallet) throw createError("Wallet not found", 404);

    const now = new Date();
    if (!wallet.withdrawalUnlockedAt || now < wallet.withdrawalUnlockedAt) {
      throw createError("Withdrawal window is not open", 403);
    }
    if (wallet.lockedToPurchase) {
      throw createError("This wallet is locked to purchase only", 403);
    }

    const result = await withLock(`withdraw:${wallet.id}`, async () => {
      // Re-read balance inside the lock — prevents two concurrent
      // withdrawal requests both passing the balance check against a
      // stale read.
      const freshWallet = await WalletRepository.findByUserAndType(userId, type);
      if (!freshWallet) throw createError("Wallet not found", 404);

      const balance = parseFloat(freshWallet.balance as string);
      if (body.amount > balance) throw createError("Insufficient balance", 400);

      const reference = genRef("WD");

      // Reserve the funds immediately so the same balance can't be
      // withdrawn twice while the transfer is in flight with Paystack.
      const reservedBalance = (balance - body.amount).toFixed(2);
      await WalletRepository.updateBalance(freshWallet.id, reservedBalance, userId, type);

      const tx = await TransactionRepository.create({
        userId,
        type: "withdrawal",
        amount: body.amount.toString(),
        walletType: type,
        status: "pending",
        reference,
        meta: {
          bankCode: body.bankCode,
          accountNumber: body.accountNumber,
          accountName: body.accountName,
        },
      });

      try {
        const recipient = await PaystackService.createTransferRecipient({
          name: body.accountName,
          accountNumber: body.accountNumber,
          bankCode: body.bankCode,
        });

        const transfer = await PaystackService.initiateTransfer({
          amountNaira: body.amount,
          recipientCode: recipient.recipient_code,
          reason: `EidSave withdrawal ${reference}`,
          reference,
        });

        await TransactionRepository.updateMeta(reference, {
          recipientCode: recipient.recipient_code,
          transferCode: transfer.transfer_code,
          transferStatus: transfer.status,
        });

        // Status stays "pending" until the transfer.success / transfer.failed
        // / transfer.reversed webhook resolves it — a transfer initiation
        // response does not guarantee the money has actually landed.
        return tx;
      } catch (err) {
        // Could not even initiate the transfer — refund the reservation
        // immediately since nothing was sent.
        logger.error({ err, reference }, "Withdrawal transfer initiation failed — refunding reservation");
        await WalletRepository.updateBalance(freshWallet.id, balance.toFixed(2), userId, type);
        await TransactionRepository.updateStatus(reference, "failed");
        throw err;
      }
    });

    if (!result) {
      throw createError("A withdrawal is already being processed for this wallet — please wait a moment", 409);
    }

    return toTxResponse(result);
  },

  /**
   * Called by the Paystack webhook when a previously-initiated transfer
   * resolves. If it failed or was reversed after initiation, the reserved
   * funds are returned to the user's wallet.
   */
  async resolveTransferOutcome(reference: string, outcome: "success" | "failed"): Promise<void> {
    const tx = await TransactionRepository.findByReference(reference);
    if (!tx || tx.type !== "withdrawal") return;
    if (tx.status !== "pending") return; // already resolved, avoid double-refunding

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
        const refundedBalance = (parseFloat(wallet.balance as string) + parseFloat(fresh.amount as string)).toFixed(2);
        await WalletRepository.updateBalance(wallet.id, refundedBalance, fresh.userId, fresh.walletType);
      }
      await TransactionRepository.updateStatus(reference, "failed");
      logger.warn({ reference }, "Withdrawal transfer failed/reversed — funds refunded to wallet");
    });
  },

  async getTransactions(userId: string, type: "adha" | "fitr", page: number, limit: number) {
    const { transactions, total } = await TransactionRepository.findByUserAndWallet(userId, type, page, limit);
    return {
      transactions: transactions.map(tx => toTxResponse(tx)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },
};