
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5001";
const API_BASE_URL = `${rawBaseUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "")}/api`;

interface ApiErrorShape {
  status: number;
  data: unknown;
  message: string;
}

async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem("token");
  const isFormData = init.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    const err: ApiErrorShape = { status: res.status, data, message: data?.message ?? "Request failed" };
    throw err;
  }
  return data as T;
}

export function getErrorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  const err = e as { data?: { message?: string }; message?: string } | undefined;
  return err?.data?.message ?? err?.message ?? fallback;
}

/** Refresh every cached wallet/transaction query regardless of how the generated client keys them. */
export function invalidateMoneyQueries(qc: QueryClient) {
  return qc.invalidateQueries({
    predicate: (q) => {
      const k = JSON.stringify(q.queryKey).toLowerCase();
      return k.includes("wallet") || k.includes("transactions");
    },
  });
}

export function useChangePin() {
  return useMutation({
    mutationFn: (body: { currentPin: string; newPin: string }) =>
      authedFetch<{ message: string; success: boolean }>("/v1/auth/change-pin", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

interface AvatarUploadResult {
  id: string;
  avatarUrl: string | null;
  [key: string]: unknown;
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      form.append("file", file as unknown as Blob);
      return authedFetch<AvatarUploadResult>("/v1/user/avatar", { method: "POST", body: form });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => authedFetch<{ message: string; success: boolean }>("/v1/user/account", { method: "DELETE" }),
  });
}

// ---------------------------------------------------------------------------
// KYC + Xpress Wallet
// ---------------------------------------------------------------------------

export interface DepositAccount {
  walletType: "adha" | "fitr";
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface KycStatus {
  status: "none" | "verified";
  verified: boolean;
  tier: string | null;
  limits: { dailyLimit: number; maxBalance: number | null } | null;
  account: Omit<DepositAccount, "walletType"> | null;
}

export interface Bank { code: string; name: string }

export interface FeeSchedule {
  tiers: { below: number; fee: number }[];
  topFee: number;
  vatRate: number;
  stampDuty: number;
  stampDutyMin: number;
}

/** Mirrors the server's quoteTransferFee so the preview matches what gets reserved. */
export function quoteFee(amount: number, s: FeeSchedule): number {
  const base = s.tiers.find((t) => amount < t.below)?.fee ?? s.topFee;
  const stamp = amount >= s.stampDutyMin ? s.stampDuty : 0;
  return Math.round((base + base * s.vatRate + stamp) * 100) / 100;
}

export function useKycStatus() {
  return useQuery({
    queryKey: ["kyc", "status"],
    queryFn: () => authedFetch<KycStatus>("/v1/kyc/status"),
  });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { bvn: string; dateOfBirth: string; firstName: string; lastName: string }) =>
      authedFetch<KycStatus>("/v1/kyc/verify", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => qc.setQueryData(["kyc", "status"], data),
  });
}

export function useDepositAccount() {
  return useMutation({
    mutationFn: (type: "adha" | "fitr") =>
      authedFetch<DepositAccount>(`/v1/wallet/${type}/deposit/account`, { method: "POST" }),
  });
}

export function useSyncDeposits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: "adha" | "fitr") =>
      authedFetch<{
        credited: { amount: number; reference: string; walletType: "adha" | "fitr" }[];
        totalCredited: number;
      }>(`/v1/wallet/${type}/deposit/sync`, { method: "POST" }),
    onSuccess: (data) => { if (data.credited.length > 0) void invalidateMoneyQueries(qc); },
  });
}

export function useBanks() {
  return useQuery({
    queryKey: ["wallet-banks"],
    staleTime: 60 * 60 * 1000,
    queryFn: () => authedFetch<{ banks: Bank[]; feeSchedule: FeeSchedule }>("/v1/wallet/banks"),
  });
}

export function resolveBankAccount(bankCode: string, accountNumber: string) {
  return authedFetch<{ accountName: string }>(
    `/v1/wallet/resolve-account?bankCode=${encodeURIComponent(bankCode)}&accountNumber=${encodeURIComponent(accountNumber)}`,
  );
}