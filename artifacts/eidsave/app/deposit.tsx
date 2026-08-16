import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const SHORTCUTS = [1000, 5000, 10000, 50000];
const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

type WalletType = "adha" | "fitr";

export default function DepositScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [walletType, setWalletType] = useState<WalletType>("adha");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const numAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;

  const handleDeposit = async () => {
    setError("");
    if (numAmount < 500) { setError("Minimum deposit is ₦500"); return; }
    if (numAmount > 500000) { setError("Maximum deposit is ₦500,000"); return; }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
  };

  if (success) {
    return (
      <View style={[styles.successWrap, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Deposit Initiated!</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          {formatNaira(numAmount)} to your {walletType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"} wallet.{"\n"}
          Your payment will be confirmed shortly.
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
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Deposit</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Choose wallet</Text>
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
            onPress={() => setWalletType(w)}
          >
            <Text style={[styles.walletOptionText, { color: walletType === w ? colors.primaryForeground : colors.foreground }]}>
              {w === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Enter amount</Text>
      <View style={[styles.amountWrap, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.nairaSign, { color: colors.mutedForeground }]}>₦</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.foreground }]}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/\D/g, ""))}
          maxLength={7}
        />
      </View>

      <Text style={[styles.rangeNote, { color: colors.mutedForeground }]}>Min: ₦500 · Max: ₦500,000</Text>

      <View style={styles.shortcuts}>
        {SHORTCUTS.map((s) => (
          <Pressable
            key={s}
            style={[styles.shortcut, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAmount(String(s)); }}
          >
            <Text style={[styles.shortcutText, { color: colors.foreground }]}>{formatNaira(s)}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Amount</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{numAmount > 0 ? formatNaira(numAmount) : "—"}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Wallet</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {walletType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.depositBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: numAmount < 500 ? 0.5 : 1 }]}
        onPress={handleDeposit}
        disabled={loading || numAmount < 500}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="credit-card" size={18} color={colors.primaryForeground} />
            <Text style={[styles.depositBtnText, { color: colors.primaryForeground }]}>
              Pay {numAmount > 0 ? formatNaira(numAmount) : ""} via Paystack
            </Text>
          </>
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  sectionLabel: { fontSize: 13, marginBottom: 8 },
  walletToggle: { flexDirection: "row", gap: 10, marginBottom: 24 },
  walletOption: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  walletOptionText: { fontSize: 14, fontWeight: "600" },
  amountWrap: { flexDirection: "row", alignItems: "center", height: 72, borderWidth: 1, paddingHorizontal: 16, marginBottom: 8 },
  nairaSign: { fontSize: 28, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "600" },
  rangeNote: { fontSize: 12, marginBottom: 16 },
  shortcuts: { flexDirection: "row", gap: 8, marginBottom: 20 },
  shortcut: { flex: 1, height: 40, alignItems: "center", justifyContent: "center" },
  shortcutText: { fontSize: 12, fontWeight: "500" },
  error: { fontSize: 13, marginBottom: 12 },
  summaryCard: { borderWidth: 1, padding: 16, marginBottom: 24, gap: 0 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  summaryDivider: { height: StyleSheet.hairlineWidth },
  depositBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  depositBtnText: { fontSize: 16, fontWeight: "600" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontWeight: "700" },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: { marginTop: 8, paddingHorizontal: 48, height: 52, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 16, fontWeight: "600" },
});
