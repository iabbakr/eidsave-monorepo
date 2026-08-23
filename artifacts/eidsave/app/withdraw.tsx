import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useGetWallet, useWithdrawFunds } from "@workspace/api-client-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

export default function WithdrawScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [walletType, setWalletType] = useState<"adha" | "fitr">("fitr");
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("058"); // Default GTBank
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: wallet } = useGetWallet(walletType);
  const withdrawMutation = useWithdrawFunds();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const numAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;
  const balance = wallet?.balance ?? 0;

  const handleWithdraw = async () => {
    setError("");
    if (numAmount < 1000) { setError("Minimum withdrawal is ₦1,000"); return; }
    if (numAmount > balance) { setError("Amount exceeds your available wallet balance"); return; }
    if (accountNumber.length !== 10) { setError("Please enter a valid 10-digit NUBAN account number"); return; }

    try {
      const response = await withdrawMutation.mutateAsync({
        type: walletType,
        data: {
          amount: numAmount,
          accountNumber,
          bankCode,
          accountName: accountName.trim() || "Verified Account",
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addNotification({
        title: "Withdrawal Initiated",
        body: `${formatNaira(numAmount)} sent to account ending in ${accountNumber.slice(-4)}.`,
        type: "withdrawal",
        reference: response.reference,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Withdrawal failed. Check unlock dates or balance.";
      setError(msg);
    }
  };

  if (success) {
    return (
      <View style={[styles.successWrap, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Withdrawal Processed!</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          {formatNaira(numAmount)} has been transferred from your {walletType === "adha" ? "Adha" : "Fitr"} wallet.{"\n"}
          Funds will arrive in your bank account shortly.
        </Text>
        <Pressable
          style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Done</Text>
        </Pressable>
      </View>
    );
  }

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

      <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>10-Digit Account Number</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        placeholder="0123456789"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="numeric"
        maxLength={10}
        value={accountNumber}
        onChangeText={setAccountNumber}
      />

      <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>Account Name</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        placeholder="Account Holder Full Name"
        placeholderTextColor={colors.mutedForeground}
        value={accountName}
        onChangeText={setAccountName}
      />

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <Pressable
        style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: withdrawMutation.isPending ? 0.7 : 1 }]}
        onPress={handleWithdraw}
        disabled={withdrawMutation.isPending}
      >
        {withdrawMutation.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Confirm Bank Payout</Text>
        )}
      </Pressable>
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
  input: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
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