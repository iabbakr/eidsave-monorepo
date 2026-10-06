import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useGetUserProfile } from "@workspace/api-client-react";
import { useKycStatus, useSubmitKyc, getErrorMessage } from "@/hooks/useAccountActions";

function formatDob(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length > 6) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
  if (d.length > 4) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d;
}

export default function KycScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useGetUserProfile();
  const kyc = useKycStatus();
  const submit = useSubmitKyc();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bvn, setBvn] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");

  // Prefill from the registered full name; user can correct it to match their BVN exactly.
  useEffect(() => {
    if (!profile?.name || firstName || lastName) return;
    const parts = profile.name.trim().split(/\s+/);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
  }, [profile?.name]);

  const handleSubmit = async () => {
    setError("");
    if (!firstName.trim() || !lastName.trim()) { setError("Enter your first and last name exactly as on your BVN"); return; }
    if (!/^\d{11}$/.test(bvn)) { setError("BVN must be 11 digits"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) { setError("Enter your date of birth as YYYY-MM-DD"); return; }
    try {
      await submit.mutateAsync({ bvn, dateOfBirth: dob, firstName: firstName.trim(), lastName: lastName.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(e, "Verification failed. Check your details and try again."));
    }
  };

  const verified = kyc.data?.verified;

  if (verified && kyc.data?.account) {
    const a = kyc.data.account;
    return (
      <View style={[styles.successWrap, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>You're verified</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Your personal deposit account is ready:{"\n"}
          {a.bankName} · {a.accountNumber}
        </Text>
        <Pressable style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, paddingHorizontal: 48 }]} onPress={() => router.back()}>
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const input = [styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }];

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      bottomOffset={20}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Verify identity</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        We use your BVN to confirm who you are and open your personal deposit account. We don't store your full BVN.
      </Text>

      <Text style={[styles.label, { color: colors.foreground }]}>First name (as on BVN)</Text>
      <TextInput style={input} value={firstName} onChangeText={setFirstName} autoCapitalize="words" placeholderTextColor={colors.mutedForeground} />

      <Text style={[styles.label, { color: colors.foreground }]}>Last name (as on BVN)</Text>
      <TextInput style={input} value={lastName} onChangeText={setLastName} autoCapitalize="words" placeholderTextColor={colors.mutedForeground} />

      <Text style={[styles.label, { color: colors.foreground }]}>BVN</Text>
      <TextInput
        style={input}
        value={bvn}
        onChangeText={(v) => setBvn(v.replace(/\D/g, "").slice(0, 11))}
        keyboardType="number-pad"
        placeholder="11 digits"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry
        maxLength={11}
      />

      <Text style={[styles.label, { color: colors.foreground }]}>Date of birth</Text>
      <TextInput
        style={input}
        value={dob}
        onChangeText={(v) => setDob(formatDob(v))}
        keyboardType="number-pad"
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.mutedForeground}
        maxLength={10}
      />

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <Pressable
        style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: submit.isPending ? 0.7 : 1, marginTop: 24 }]}
        onPress={handleSubmit}
        disabled={submit.isPending}
      >
        {submit.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : (
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Verify & create account</Text>
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 14 },
  input: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  error: { fontSize: 13, marginTop: 14 },
  btn: { height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "600" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontWeight: "700" },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});