import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetUserProfile } from "@workspace/api-client-react";
import { useUploadAvatar } from "@/hooks/useAccountActions";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

const SUPPORT_EMAIL = "support@eidsave.com";
const SUPPORT_PHONE = "08140002708";

function InfoRow({ icon, label, value, colors }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={15} color={colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: userProfile, refetch } = useGetUserProfile();
  const uploadAvatarMutation = useUploadAvatar();

  const initial = userProfile?.name?.charAt(0)?.toUpperCase() ?? "U";
  const address = userProfile?.address;
  const nextOfKin = userProfile?.nextOfKin;
  const avatarUrl = (userProfile as { avatarUrl?: string | null } | undefined)?.avatarUrl;

  const handleChangeAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets[0]) return;

    const asset = res.assets[0];
    try {
      await uploadAvatarMutation.mutateAsync({
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refetch();
    } catch {
      Alert.alert("Upload failed", "Could not update your profile photo. Please try again.");
    }
  };

  const explainLockedEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Details are locked",
      `For security reasons, your name, phone, address, and next of kin can't be changed in the app. To update them, contact support at ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
      [
        { text: "Close", style: "cancel" },
        { text: "Email Support", onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
        { text: "Call Support", onPress: () => Linking.openURL(`tel:${SUPPORT_PHONE}`) },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar — the one thing that IS editable here ─────────── */}
        <Pressable onPress={handleChangeAvatar} style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initial}</Text>
          )}
          <View style={[styles.avatarEditBadge, { backgroundColor: colors.card, borderColor: colors.background }]}>
            {uploadAvatarMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="camera" size={13} color={colors.foreground} />
            )}
          </View>
        </Pressable>
        <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>Tap to change your photo</Text>

        {/* ── Locked details ──────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardHeaderTitle, { color: colors.foreground }]}>Personal Details</Text>
            <Pressable onPress={explainLockedEdit} hitSlop={8} style={styles.lockedBtn}>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
              <Feather name="edit-2" size={15} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <InfoRow icon="user" label="Full Name" value={userProfile?.name || "Not set"} colors={colors} />
          <InfoRow icon="mail" label="Email" value={userProfile?.email || "Not set"} colors={colors} />
          <InfoRow icon="phone" label="Phone" value={userProfile?.phone || "Not set"} colors={colors} />
          <InfoRow
            icon="map-pin"
            label="Delivery Address"
            value={
              address
                ? `${address.address ? address.address + ", " : ""}${address.area ? address.area + ", " : ""}${address.city}, ${address.state}`
                : "Not set"
            }
            colors={colors}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardHeaderTitle, { color: colors.foreground }]}>Next of Kin</Text>
            <Pressable onPress={explainLockedEdit} hitSlop={8} style={styles.lockedBtn}>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
              <Feather name="edit-2" size={15} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {nextOfKin ? (
            <>
              <InfoRow icon="user" label="Name" value={nextOfKin.name} colors={colors} />
              <InfoRow icon="phone" label="Phone" value={nextOfKin.phone} colors={colors} />
              <InfoRow icon="heart" label="Relationship" value={nextOfKin.relationship} colors={colors} />
            </>
          ) : (
            <Pressable onPress={explainLockedEdit}>
              <Text style={[styles.emptyNokText, { color: colors.mutedForeground }]}>
                No next of kin on file yet. Contact support to add one.
              </Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.noticeCard, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Feather name="shield" size={16} color={colors.mutedForeground} style={{ marginTop: 1 }} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            For your security, only your profile photo can be changed in the app. To update your name, phone,
            address, or next of kin, reach us at{" "}
            <Text style={{ fontWeight: "600" }} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              {SUPPORT_EMAIL}
            </Text>{" "}
            or{" "}
            <Text style={{ fontWeight: "600" }} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}>
              {SUPPORT_PHONE}
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 17, fontWeight: "600" },
  content: { paddingHorizontal: 20, alignItems: "center" },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 8, overflow: "visible" },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: "700" },
  avatarEditBadge: { position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarHint: { fontSize: 12, marginBottom: 20 },
  card: { width: "100%", borderWidth: 1, padding: 16, marginBottom: 16, gap: 4 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardHeaderTitle: { fontSize: 14, fontWeight: "700" },
  lockedBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 4 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  infoIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 14, marginTop: 2 },
  emptyNokText: { fontSize: 13, lineHeight: 18 },
  noticeCard: { flexDirection: "row", gap: 10, padding: 14, width: "100%", alignItems: "flex-start" },
  noticeText: { fontSize: 12, lineHeight: 18, flex: 1 },
});