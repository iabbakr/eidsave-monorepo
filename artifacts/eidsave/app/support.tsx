import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useCreateSupportTicket } from "@workspace/api-client-react";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const CATEGORIES = [
  { id: "deposit", label: "Deposit Issue", icon: "credit-card" as const },
  { id: "delivery", label: "Delivery Problem", icon: "truck" as const },
  { id: "wrong_info", label: "Wrong Information", icon: "alert-circle" as const },
  { id: "account", label: "Account Issue", icon: "user" as const },
  { id: "other", label: "Other", icon: "help-circle" as const },
];

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mutation = useCreateSupportTicket();

  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const pickImage = async () => {
    if (photos.length >= 3) {
      setError("Maximum 3 screenshots allowed");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setPhotos([...photos, res.assets[0].uri]);
    }
  };

  const removeImage = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError("");
    if (!category) { setError("Please select a category"); return; }
    if (message.trim().length < 10) { setError("Message must be at least 10 characters"); return; }

    try {
      await mutation.mutateAsync({
        data: {
          category: category as import("@workspace/api-client-react").CreateTicketRequestCategory,
          message: message.trim(),
          photos: photos.length > 0 ? photos : undefined,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch {
      setError("Failed to submit ticket. Please try again.");
    }
  };

  if (success) {
    return (
      <View style={[styles.successWrap, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Ticket Submitted!</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          We'll get back to you within 24 hours.{"\n"}Check your notifications for updates.
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
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>What's the issue?</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              styles.catCard,
              {
                backgroundColor: category === cat.id ? colors.primary + "10" : colors.card,
                borderColor: category === cat.id ? colors.primary : colors.border,
                borderRadius: colors.radius,
              },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(cat.id); }}
          >
            <Feather name={cat.icon} size={20} color={category === cat.id ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.catLabel, { color: category === cat.id ? colors.primary : colors.foreground }]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 8 }]}>Describe your issue</Text>
      <TextInput
        style={[styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        placeholder="Tell us what happened. Include order numbers or transaction references..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={6}
        value={message}
        onChangeText={setMessage}
        maxLength={1000}
        textAlignVertical="top"
      />
      <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{message.length}/1000</Text>

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Attach Screenshots (Optional)</Text>
      <View style={styles.photoRow}>
        {photos.map((uri, idx) => (
          <View key={idx} style={[styles.photoPreviewWrap, { borderColor: colors.border }]}>
            <Image source={{ uri }} style={styles.photoPreview} />
            <Pressable onPress={() => removeImage(idx)} style={styles.removePhotoBtn}>
              <Feather name="x" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {photos.length < 3 && (
          <Pressable
            style={[styles.addPhotoBtn, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            onPress={pickImage}
          >
            <Feather name="camera" size={20} color={colors.mutedForeground} />
            <Text style={[styles.addPhotoText, { color: colors.mutedForeground }]}>Add Photo</Text>
          </Pressable>
        )}
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <Pressable
        style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: mutation.isPending ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="send" size={18} color={colors.primaryForeground} />
            <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Submit Ticket</Text>
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
  sectionLabel: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  catCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5 },
  catLabel: { fontSize: 13, fontWeight: "500" },
  textarea: { height: 130, borderWidth: 1, padding: 16, fontSize: 15, lineHeight: 22 },
  charCount: { fontSize: 12, alignSelf: "flex-end", marginTop: 4, marginBottom: 16 },
  photoRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  photoPreviewWrap: { width: 70, height: 70, borderRadius: 10, borderWidth: 1, overflow: "hidden", position: "relative" },
  photoPreview: { width: "100%", height: "100%" },
  removePhotoBtn: { position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  addPhotoBtn: { width: 90, height: 70, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  addPhotoText: { fontSize: 11, fontWeight: "500" },
  error: { fontSize: 13, marginBottom: 12 },
  submitBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  submitBtnText: { fontSize: 16, fontWeight: "600" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontWeight: "700" },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: { marginTop: 8, paddingHorizontal: 48, height: 52, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 16, fontWeight: "600" },
});