import { WalletRepository } from "../repositories/wallet.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { createError } from "../middlewares/error.js";
import type { DepositInitBody, DepositVerifyBody, WithdrawBody } from "../schema/wallet.schema.js";

function genRef(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function toWalletResponse(wallet: Awaited<ReturnType<typeof WalletRepository.findByUserAndType>>) {
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

function toTxResponse(tx: Awaited<ReturnType<typeof TransactionRepository.findByReference>>) {
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

  async initDeposit(userId: string, type: "adha" | "fitr", body: DepositInitBody) {
    const reference = genRef("EID");
    await TransactionRepository.create({
      userId,
      type: "deposit",
      amount: body.amount.toString(),
      walletType: type,
      status: "pending",
      reference,
    });
    return {
      authorizationUrl: `https://paystack.com/pay/${reference}`,
      accessCode: reference,
      reference,
    };
  },

  async verifyDeposit(userId: string, type: "adha" | "fitr", body: DepositVerifyBody) {
    const tx = await TransactionRepository.findByReference(body.reference);
    if (!tx) throw createError("Transaction not found", 404);

    if (tx.status === "success") return toTxResponse(tx);

    await TransactionRepository.updateStatus(body.reference, "success");

    const wallet = await WalletRepository.findByUserAndType(userId, type);
    if (!wallet) throw createError("Wallet not found", 404);

    const newBalance = (parseFloat(wallet.balance as string) + parseFloat(tx.amount as string)).toFixed(2);
    await WalletRepository.updateBalance(wallet.id, newBalance, userId, type);

    const updated = await TransactionRepository.findByReference(body.reference);
    return toTxResponse(updated);
  },

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

    const balance = parseFloat(wallet.balance as string);
    if (body.amount > balance) throw createError("Insufficient balance", 400);

    const reference = genRef("WD");
    const tx = await TransactionRepository.create({
      userId,
      type: "withdrawal",
      amount: body.amount.toString(),
      walletType: type,
      status: "success",
      reference,
    });

    const newBalance = (balance - body.amount).toFixed(2);
    await WalletRepository.updateBalance(wallet.id, newBalance, userId, type);

    return toTxResponse(tx);
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
