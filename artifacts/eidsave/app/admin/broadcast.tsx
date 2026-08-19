import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBroadcastNotification, BroadcastNotificationInputTargetAudience } from "@workspace/api-client-react";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import * as Haptics from "expo-haptics";

const AUDIENCES = Object.values(BroadcastNotificationInputTargetAudience);

export default function AdminBroadcastScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mutation = useBroadcastNotification();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<string>("all");
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setError("");
    setResult(null);
    if (!title.trim()) { setError("Title is required"); return; }
    if (message.trim().length < 5) { setError("Message must be at least 5 characters"); return; }

    try {
      const res = await mutation.mutateAsync({
        data: {
          title: title.trim(),
          message: message.trim(),
          targetAudience: audience as (typeof BroadcastNotificationInputTargetAudience)[keyof typeof BroadcastNotificationInputTargetAudience],
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult({ sent: res.sent, failed: res.failed });
      setTitle("");
      setMessage("");
    } catch {
      setError("Failed to send broadcast");
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
    >
      <AdminHeader title="Broadcast" backTo="/admin" />

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Target Audience</Text>
      <View style={styles.audienceRow}>
        {AUDIENCES.map((a) => (
          <Pressable
            key={a}
            style={[styles.audienceChip, { backgroundColor: audience === a ? colors.primary : colors.muted, borderRadius: colors.radius }]}
            onPress={() => setAudience(a)}
          >
            <Text style={[styles.audienceText, { color: audience === a ? colors.primaryForeground : colors.foreground }]}>
              {a.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Title</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Notification title"
        placeholderTextColor={colors.mutedForeground}
        maxLength={100}
      />

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Message</Text>
      <TextInput
        style={[styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        value={message}
        onChangeText={setMessage}
        placeholder="Write your announcement..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={5}
        maxLength={500}
        textAlignVertical="top"
      />
      <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{message.length}/500</Text>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      {result && (
        <View style={[styles.resultBox, { backgroundColor: colors.success + "15", borderColor: colors.success + "40", borderRadius: colors.radius }]}>
          <Feather name="check-circle" size={18} color={colors.success} />
          <Text style={[styles.resultText, { color: colors.foreground }]}>
            Sent to {result.sent} devices{result.failed > 0 ? ` · ${result.failed} failed` : ""}
          </Text>
        </View>
      )}

      <Pressable
        style={[styles.sendBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: mutation.isPending ? 0.7 : 1 }]}
        onPress={handleSend}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="send" size={18} color={colors.primaryForeground} />
            <Text style={[styles.sendBtnText, { color: colors.primaryForeground }]}>Send Broadcast</Text>
          </>
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 14, fontWeight: "600", marginBottom: 10, marginTop: 8 },
  audienceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  audienceChip: { paddingHorizontal: 14, paddingVertical: 8 },
  audienceText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  input: { borderWidth: 1, paddingHorizontal: 14, height: 48, fontSize: 15 },
  textarea: { borderWidth: 1, padding: 14, fontSize: 15, minHeight: 120 },
  charCount: { fontSize: 12, alignSelf: "flex-end", marginTop: 4 },
  error: { fontSize: 13, marginTop: 8 },
  resultBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderWidth: 1, marginTop: 12 },
  resultText: { fontSize: 14, flex: 1 },
  sendBtn: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 20 },
  sendBtnText: { fontSize: 16, fontWeight: "600" },
});
