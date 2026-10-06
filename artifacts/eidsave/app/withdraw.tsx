import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { BankPicker } from "@/components/BankPicker";
import { KycGate } from "@/components/KycGate";
import { useGetWallet, useWithdrawFunds } from "@workspace/api-client-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  useKycStatus,
  useBanks,
  resolveBankAccount,
  quoteFee,
  invalidateMoneyQueries,
  getErrorMessage,
  type Bank,
} from "@/hooks/useAccountActions";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

type WalletType = "adha" | "fitr";

export default function WithdrawScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ wallet?: WalletType }>();

  const [walletType, setWalletType] = useState<WalletType>(params.wallet === "fitr" ? "fitr" : "adha");
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bank, setBank] = useState<Bank | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resolvedName, setResolvedName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | "success" | "pending">(null);

  const kyc = useKycStatus();
  const { data: bankData } = useBanks();
  const { data: wallet } = useGetWallet(walletType);
  const withdrawMutation = useWithdrawFunds();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const numAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;
  const fee = bankData && numAmount > 0 ? quoteFee(numAmount, bankData.feeSchedule) : 0;
  const balance = wallet?.balance ?? 0;

  // Look up the account holder's name from the bank - never rely on what the user types.
  useEffect(() => {
    setResolvedName("");
    if (!bank || accountNumber.length !== 10) return;
    let cancelled = false;
    setResolving(true);
    setError("");
    resolveBankAccount(bank.code, accountNumber)
      .then((r) => { if (!cancelled) setResolvedName(r.accountName); })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e, "Couldn't verify this account")); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [bank, accountNumber]);

  const handleWithdraw = async () => {
    setError("");
    if (numAmount < 1000) { setError("Minimum withdrawal is ₦1,000"); return; }
    if (numAmount + fee > balance) { setError(`Amount plus the ${formatNaira(fee)} transfer fee exceeds your balance`); return; }
    if (!bank) { setError("Select your bank"); return; }
    if (accountNumber.length !== 10) { setError("Please enter a valid 10-digit account number"); return; }
    if (!resolvedName) { setError("We couldn't confirm the account name yet"); return; }

    try {
      const response = await withdrawMutation.mutateAsync({
        type: walletType,
        data: { amount: numAmount, accountNumber, bankCode: bank.code, accountName: resolvedName },
      });

      await invalidateMoneyQueries(queryClient);

      const pending = response.status === "pending";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addNotification({
        title: pending ? "Withdrawal Processing" : "Withdrawal Sent",
        body: `${formatNaira(numAmount)} ${pending ? "is being sent" : "sent"} to ${resolvedName} (…${accountNumber.slice(-4)}).`,
        type: "withdrawal",
        reference: response.reference,
      });
      setResult(pending ? "pending" : "success");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(err, "Withdrawal failed. Check your balance and the withdrawal window."));
    }
  };

  if (result) {
    const pending = result === "pending";
    return (
      <View style={[styles.successWrap, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.successIcon, { backgroundColor: (pending ? colors.accent : colors.success) + "20" }]}>
          <Feather name={pending ? "clock" : "check-circle"} size={56} color={pending ? colors.accent : colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          {pending ? "Withdrawal Processing" : "Withdrawal Sent!"}
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          {formatNaira(numAmount)} {pending ? "is on its way" : "has been sent"} from your {walletType === "adha" ? "Adha" : "Fitr"} wallet to {resolvedName}.{"\n"}
          {pending ? "We're confirming it with the bank - check Transactions shortly." : "It should reflect in the account shortly."}
        </Text>
        <Pressable style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]} onPress={() => router.back()}>
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const field = [styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }];

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      bottomOffset={20}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Withdraw Funds</Text>
        <View style={{ width: 36 }} />
      </View>

      {kyc.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !kyc.data?.verified ? (
        <KycGate body="Verify your BVN before withdrawing so we can send money to your bank safely." />
      ) : (
        <>
          <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
            <Text style={[styles.balanceLabel, { color: colors.primaryForeground, opacity: 0.8 }]}>
              Available {walletType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"} Balance
            </Text>
            <Text style={[styles.balanceValue, { color: colors.primaryForeground }]}>{formatNaira(balance)}</Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Select Wallet</Text>
          <View style={styles.walletToggle}>
            {(["adha", "fitr"] as const).map((w) => (
              <Pressable
                key={w}
                style={[
                  styles.walletOption,
                  {
                    backgroundColor: walletType === w ? colors.primary : colors.card,
                    borderColor: walletType === w ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                onPress={() => setWalletType(w)}
              >
                <Text style={[styles.walletOptionText, { color: walletType === w ? colors.primaryForeground : colors.foreground }]}>
                  {w === "adha" ? "Adha Wallet" : "Fitr Wallet"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Withdrawal Amount</Text>
          <View style={[styles.amountWrap, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.nairaSign, { color: colors.mutedForeground }]}>₦</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/\D/g, ""))}
            />
          </View>
          {fee > 0 ? (
            <Text style={[styles.feeNote, { color: colors.mutedForeground }]}>
              Transfer fee: {formatNaira(fee)} (deducted from your wallet)
            </Text>
          ) : null}
          {kyc.data?.limits ? (
            <Text style={[styles.feeNote, { color: colors.mutedForeground }]}>
              Daily limit: {formatNaira(kyc.data.limits.dailyLimit)}
            </Text>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>Bank</Text>
          <Pressable style={[...field, styles.bankRow]} onPress={() => setPickerOpen(true)} disabled={!bankData}>
            <Text style={{ color: bank ? colors.foreground : colors.mutedForeground, fontSize: 15, flex: 1 }}>
              {bank?.name ?? (bankData ? "Select bank" : "Loading banks…")}
            </Text>
            <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
          </Pressable>

          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>10-Digit Account Number</Text>
          <TextInput
            style={field}
            placeholder="0123456789"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            maxLength={10}
            value={accountNumber}
            onChangeText={(v) => setAccountNumber(v.replace(/\D/g, ""))}
          />

          {resolving ? (
            <View style={styles.resolveRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.resolveText, { color: colors.mutedForeground }]}>Verifying account…</Text>
            </View>
          ) : resolvedName ? (
            <View style={[styles.resolveRow, { backgroundColor: colors.success + "15", borderRadius: colors.radius, padding: 12 }]}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.resolveText, { color: colors.success, fontWeight: "600" }]}>{resolvedName}</Text>
            </View>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          <Pressable
            style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: withdrawMutation.isPending || !resolvedName ? 0.6 : 1 }]}
            onPress={handleWithdraw}
            disabled={withdrawMutation.isPending || !resolvedName}
          >
            {withdrawMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Confirm Bank Payout</Text>
            )}
          </Pressable>

          <BankPicker
            visible={pickerOpen}
            banks={bankData?.banks ?? []}
            onClose={() => setPickerOpen(false)}
            onSelect={(b) => { setBank(b); setPickerOpen(false); }}
          />
        </>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  balanceCard: { padding: 20, borderRadius: 16, marginBottom: 20 },
  balanceLabel: { fontSize: 12 },
  balanceValue: { fontSize: 28, fontWeight: "700", marginTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  walletToggle: { flexDirection: "row", gap: 10, marginBottom: 20 },
  walletOption: { flex: 1, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  walletOptionText: { fontSize: 13, fontWeight: "600" },
  amountWrap: { flexDirection: "row", alignItems: "center", height: 60, borderWidth: 1, paddingHorizontal: 16, marginBottom: 4 },
  nairaSign: { fontSize: 24, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: "600" },
  feeNote: { fontSize: 12, marginTop: 4 },
  input: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  bankRow: { flexDirection: "row", alignItems: "center" },
  resolveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  resolveText: { fontSize: 14 },
  error: { fontSize: 13, marginTop: 12 },
  submitBtn: { height: 56, alignItems: "center", justifyContent: "center", marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: "600" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontWeight: "700" },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: { marginTop: 8, paddingHorizontal: 48, height: 52, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 16, fontWeight: "600" },
});