import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { LocationFilter, type LocationValue } from "@/components/LocationFilter";
import { useCompleteProfile } from "@workspace/api-client-react";

// Shown once, right after a brand-new Google/Apple sign-up (see
// SocialAuthButtons -> router.replace("/complete-profile")). Password
// signups never see this screen — they fill everything in during
// registration itself.
export default function CompleteProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const completeMutation = useCompleteProfile();

  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<Partial<LocationValue>>({});
  const [address, setAddress] = useState("");
  const [nkName, setNkName] = useState("");
  const [nkPhone, setNkPhone] = useState("");
  const [nkRel, setNkRel] = useState("");
  const [error, setError] = useState("");

  const handleContinue = async () => {
    setError("");
    if (!phone.trim()) { setError("Phone number is required"); return; }
    if (!location.state || !location.city || !location.area) { setError("Please select your state, city, and area"); return; }
    if (!address.trim()) { setError("Please enter your address"); return; }

    try {
      const updated = await completeMutation.mutateAsync({
        phone: phone.trim(),
        address: {
          state: location.state,
          city: location.city,
          area: location.area,
          address: address.trim(),
        },
        nextOfKin: nkName ? { name: nkName.trim(), phone: nkPhone.trim(), relationship: nkRel.trim() } : undefined,
        profileSetupCompleted: true,
      });

      setUser(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save your details. Please try again.";
      setError(msg);
    }
  };

  const displayName = user?.name ?? "there";

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32, paddingHorizontal: 24 }}
      bottomOffset={20}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
        <Feather name="user-check" size={28} color={colors.primaryForeground} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Welcome, {displayName.split(" ")[0]}!</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Just a couple more details so we can plan your Eid deliveries correctly.
      </Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Phone Number *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
            placeholder="08012345678"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>State, City & Area *</Text>
          <LocationFilter value={location} onChange={(v) => setLocation(v)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Address *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
            placeholder="12 Ibrahim Taiwo Road"
            placeholderTextColor={colors.mutedForeground}
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Next of Kin (Optional)</Text>
        {[
          { label: "Full Name", value: nkName, set: setNkName, placeholder: "Fatimah Ibrahim" },
          { label: "Phone Number", value: nkPhone, set: setNkPhone, placeholder: "08012345678", keyboard: "phone-pad" as const },
          { label: "Relationship", value: nkRel, set: setNkRel, placeholder: "Sister, Father, etc." },
        ].map((f) => (
          <View key={f.label} style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{f.label}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder={f.placeholder}
              placeholderTextColor={colors.mutedForeground}
              value={f.value}
              onChangeText={f.set}
              keyboardType={(f as { keyboard?: "phone-pad" }).keyboard}
              autoCapitalize="words"
            />
          </View>
        ))}

        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={handleContinue}
          disabled={completeMutation.isPending}
        >
          {completeMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Enter EidSave</Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  input: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  error: { fontSize: 13 },
  btn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: "600" },
});
