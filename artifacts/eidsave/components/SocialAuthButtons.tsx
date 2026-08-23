import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { useSocialAuth } from "@/services/socialAuth.service";
import * as Haptics from "expo-haptics";

export function SocialAuthButtons() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();
  const { signInWithGoogle, signInWithApple, loading, error, isAppleAvailable } = useSocialAuth();

  const handleResult = async (result: Awaited<ReturnType<typeof signInWithGoogle>>) => {
    if (!result) return;
    await login(result.token, result.user);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // ✅ Gate: brand-new social sign-ups land with a minimal account and
    // must complete the onboarding form (phone, address, next of kin)
    // before entering the app. Returning users skip straight in.
    if (result.isNewUser) {
      router.replace("/complete-profile");
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or continue with</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <View style={styles.buttonsRow}>
        <Pressable
          style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
          onPress={async () => handleResult(await signInWithGoogle())}
          disabled={loading !== null}
        >
          {loading === "google" ? (
            <ActivityIndicator color={colors.foreground} size="small" />
          ) : (
            <>
              <Feather name="chrome" size={18} color={colors.foreground} />
              <Text style={[styles.socialBtnText, { color: colors.foreground }]}>Google</Text>
            </>
          )}
        </Pressable>

        {isAppleAvailable && (
          <Pressable
            style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            onPress={async () => handleResult(await signInWithApple())}
            disabled={loading !== null}
          >
            {loading === "apple" ? (
              <ActivityIndicator color={colors.foreground} size="small" />
            ) : (
              <>
                <Feather name="smartphone" size={18} color={colors.foreground} />
                <Text style={[styles.socialBtnText, { color: colors.foreground }]}>Apple</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12 },
  error: { fontSize: 13, textAlign: "center", marginBottom: 10 },
  buttonsRow: { flexDirection: "row", gap: 12 },
  socialBtn: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  socialBtnText: { fontSize: 14, fontWeight: "600" },
});
