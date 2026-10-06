import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { PinPad } from "@/components/PinPad";
import { useChangePin } from "@/hooks/useAccountActions";

type Stage = "current" | "new" | "confirm";
const PIN_LENGTH = 4;

export default function ChangePinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const changePinMutation = useChangePin();

  const [stage, setStage] = useState<Stage>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const titles: Record<Stage, string> = {
    current: "Enter your current PIN",
    new: "Choose a new PIN",
    confirm: "Confirm your new PIN",
  };

  const submitChange = async (finalConfirm: string, finalNewPin: string) => {
    if (finalConfirm !== finalNewPin) {
      setError("PINs do not match. Try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setNewPin("");
      setConfirmPin("");
      setStage("new");
      return;
    }

    try {
      await changePinMutation.mutateAsync({ currentPin, newPin: finalNewPin });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Failed to change PIN";
      setError(msg);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setStage("current");
    }
  };

  const handlePinChange = (value: string) => {
    setError("");
    if (stage === "current") {
      setCurrentPin(value);
      if (value.length === PIN_LENGTH) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStage("new");
      }
    } else if (stage === "new") {
      setNewPin(value);
      if (value.length === PIN_LENGTH) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStage("confirm");
      }
    } else {
      setConfirmPin(value);
      if (value.length === PIN_LENGTH) {
        submitChange(value, newPin);
      }
    }
  };

  const activeValue = stage === "current" ? currentPin : stage === "new" ? newPin : confirmPin;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Change PIN</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>{titles[stage]}</Text>
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        {changePinMutation.isPending ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <PinPad pin={activeValue} onChange={handlePinChange} colors={colors} length={PIN_LENGTH} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 17, fontWeight: "600" },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 24 },
  error: { fontSize: 13, textAlign: "center", marginBottom: 16 },
});