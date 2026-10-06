import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Share, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useNotificationStore } from "@/store/useNotificationStore";
import { KycGate } from "@/components/KycGate";
import {
  useKycStatus,
  useDepositAccount,
  useSyncDeposits,
  getErrorMessage,
  type DepositAccount,
} from "@/hooks/useAccountActions";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });
const POLL_MS = 10_000;
const MAX_POLLS = 30; // ~5 minutes

type WalletType = "adha" | "fitr";
const label = (w: WalletType) => (w === "adha" ? "Eid al-Adha" : "Eid al-Fitr");

export default function DepositScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ wallet?: WalletType }>();

  const [walletType, setWalletType] = useState<WalletType>(params.wallet === "fitr" ? "fitr" : "adha");
  const [account, setAccount] = useState<DepositAccount | null>(null);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);
  const [received, setReceived] = useState<number | null>(null);

  const kyc = useKycStatus();
  const accountMutation = useDepositAccount();
  const syncMutation = useSyncDeposits();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Fetching the account also tells the server which wallet new transfers should fund.
  useEffect(() => {
    if (!kyc.data?.verified) return;
    let cancelled = false;
    setAccount(null);
    setError("");
    accountMutation
      .mutateAsync(walletType)
      .then((a) => { if (!cancelled) setAccount(a); })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e)); });
    return () => { cancelled = true; };
  }, [kyc.data?.verified, walletType]);

  const check = useCallback(async (): Promise<boolean> => {
    try {
      const res = await syncMutation.mutateAsync(walletType);
      if (res.totalCredited > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addNotification({
          title: "Deposit Received",
          body: `${formatNaira(res.totalCredited)} added to your ${label(walletType)} wallet.`,
          type: "deposit",
          reference: res.credited[0]?.reference,
        });
        setReceived(res.totalCredited);
        return true;
      }
      return false;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    }
  }, [walletType]);

  useEffect(() => {
    if (!polling) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      const got = await check();
      if (got || tries >= MAX_POLLS) setPolling(false);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [polling, check]);

  const onCheckPressed = async () => {
    setError("");
    const got = await check();
    if (!got) setPolling(true);
  };

  const shareDetails = () => {
    if (!account) return;
    void Share.share({ message: `${account.bankName}\n${account.accountNumber}\n${account.accountName}` });
  };

  if (received !== null) {
    return (
      <View style={[styles.successWrap, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Deposit Confirmed!</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          {formatNaira(received)} credited to your {label(walletType)} wallet.{"\n"}
          Official receipt sent to your email.
        </Text>
        <Pressable style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]} onPress={() => router.back()}>
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Deposit</Text>
        <View style={{ width: 36 }} />
      </View>

      {kyc.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !kyc.data?.verified ? (
        <KycGate body="Verify your BVN once to get your own bank account number for deposits." />
      ) : (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Deposit into</Text>
          <View style={styles.walletToggle}>
            {(["adha", "fitr"] as WalletType[]).map((w) => (
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
                onPress={() => { setPolling(false); setWalletType(w); }}
              >
                <Text style={[styles.walletOptionText, { color: walletType === w ? colors.primaryForeground : colors.foreground }]}>
                  {label(w)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {account ? (
              <>
                <Text style={[styles.accLabel, { color: colors.mutedForeground }]}>Bank</Text>
                <Text style={[styles.accValue, { color: colors.foreground }]}>{account.bankName}</Text>
                <Text style={[styles.accLabel, { color: colors.mutedForeground, marginTop: 14 }]}>Account number</Text>
                <Text selectable style={[styles.accNumber, { color: colors.foreground }]}>{account.accountNumber}</Text>
                <Text style={[styles.accLabel, { color: colors.mutedForeground, marginTop: 14 }]}>Account name</Text>
                <Text selectable style={[styles.accValue, { color: colors.foreground }]}>{account.accountName}</Text>
                <Pressable style={[styles.shareBtn, { backgroundColor: colors.muted, borderRadius: colors.radius }]} onPress={shareDetails}>
                  <Feather name="share" size={15} color={colors.foreground} />
                  <Text style={[styles.shareText, { color: colors.foreground }]}>Share details</Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </View>

          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            Transfer any amount from your bank app to this account. It will be credited to your {label(walletType)} wallet,
            usually within a minute. This account is yours only - don't share it as a way to pay someone else.
          </Text>
          {kyc.data?.limits?.maxBalance ? (
            <Text style={[styles.note, { color: colors.mutedForeground }]}>
              Your verification level lets your account hold up to ₦{kyc.data.limits.maxBalance.toLocaleString("en-NG")} in total
              across both wallets. Transfers that take you over this may be rejected by the bank.
            </Text>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          <Pressable
            style={[styles.checkBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: !account || syncMutation.isPending ? 0.6 : 1 }]}
            onPress={onCheckPressed}
            disabled={!account || syncMutation.isPending}
          >
            {syncMutation.isPending || polling ? (
              <>
                <ActivityIndicator color={colors.primaryForeground} />
                <Text style={[styles.checkBtnText, { color: colors.primaryForeground }]}>
                  {polling ? "Waiting for your transfer…" : "Checking…"}
                </Text>
              </>
            ) : (
              <Text style={[styles.checkBtnText, { color: colors.primaryForeground }]}>I've made the transfer</Text>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  sectionLabel: { fontSize: 13, marginBottom: 8 },
  walletToggle: { flexDirection: "row", gap: 10, marginBottom: 24 },
  walletOption: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  walletOptionText: { fontSize: 14, fontWeight: "600" },
  accountCard: { borderWidth: 1, padding: 20, minHeight: 190, justifyContent: "center", marginBottom: 16 },
  accLabel: { fontSize: 12 },
  accValue: { fontSize: 16, fontWeight: "600", marginTop: 2 },
  accNumber: { fontSize: 30, fontWeight: "700", letterSpacing: 2, marginTop: 2 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 40, marginTop: 18 },
  shareText: { fontSize: 14, fontWeight: "500" },
  note: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  error: { fontSize: 13, marginBottom: 12 },
  checkBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  checkBtnText: { fontSize: 16, fontWeight: "600" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontWeight: "700" },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: { marginTop: 8, paddingHorizontal: 48, height: 52, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 16, fontWeight: "600" },
});