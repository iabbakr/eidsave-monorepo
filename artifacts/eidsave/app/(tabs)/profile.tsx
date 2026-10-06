import { View, Text, StyleSheet, Pressable, ScrollView, Share, Alert, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { useGetUserProfile } from "@workspace/api-client-react";
import { useUploadAvatar } from "@/hooks/useAccountActions";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

type FeatherIconName = "list" | "message-circle" | "settings" | "log-out" | "chevron-right" | "award" | "copy" | "credit-card" | "trash-2";

function ProfileRow({ label, icon, onPress, danger, colors }: {
  label: string;
  icon: FeatherIconName;
  onPress: () => void;
  danger?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? colors.destructive + "15" : colors.muted }]}>
        <Feather name={icon} size={18} color={danger ? colors.destructive : colors.foreground} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function InfoRow({ icon, label, value, colors }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={15} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const { data: userProfile, refetch } = useGetUserProfile();
  const uploadAvatarMutation = useUploadAvatar();

  const initial = userProfile?.name?.charAt(0)?.toUpperCase() ?? "U";
  const profileComplete = userProfile?.profileComplete ?? 70;
  const nextOfKin = userProfile?.nextOfKin;
  const avatarUrl = (userProfile as { avatarUrl?: string | null } | undefined)?.avatarUrl;

  const handleShareReferral = async () => {
    if (!userProfile?.referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `Join me on EidSave to save and withdraw for your Eid festivities stress-free. Use my invite code: ${userProfile.referralCode}`,
    });
  };

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

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of EidSave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
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

      <Text style={[styles.name, { color: colors.foreground }]}>{userProfile?.name ?? "—"}</Text>
      <Text style={[styles.email, { color: colors.mutedForeground }]}>{userProfile?.email ?? "—"}</Text>

      {userProfile?.savingsStreak != null && userProfile.savingsStreak > 0 && (
        <View style={[styles.streakBadge, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30" }]}>
          <Feather name="award" size={14} color={colors.accent} />
          <Text style={[styles.streakText, { color: colors.accent }]}>
            {userProfile.savingsStreak} week saving streak
          </Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <ProfileRow label="Transaction History" icon="list" onPress={() => router.push("/transactions")} colors={colors} />
        <ProfileRow label="Withdrawal Options" icon="credit-card" onPress={() => router.push("/withdraw")} colors={colors} />
        <ProfileRow label="Support & Inquiries" icon="message-circle" onPress={() => router.push("/support")} colors={colors} />
        <ProfileRow label="Settings" icon="settings" onPress={() => router.push("/settings")} colors={colors} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.completenessRow}>
          <Text style={[styles.completenessLabel, { color: colors.foreground }]}>Profile completeness</Text>
          <Text style={[styles.completenessVal, { color: colors.primary }]}>{profileComplete}%</Text>
        </View>
        <View style={[styles.completeTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.completeBar, { width: `${profileComplete}%`, backgroundColor: colors.primary }]} />
        </View>

        {userProfile?.referralCode && (
          <View style={[styles.referralRow, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.referralLabel, { color: colors.mutedForeground }]}>Your Referral Code</Text>
              <Text style={[styles.referralCode, { color: colors.foreground }]}>{userProfile.referralCode}</Text>
            </View>
            <Pressable style={[styles.copyBtn, { backgroundColor: colors.muted }]} onPress={handleShareReferral}>
              <Feather name="copy" size={15} color={colors.foreground} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardHeaderTitle, { color: colors.foreground }]}>Account Information</Text>
          <Pressable onPress={() => router.push("/edit-profile")}>
            <Feather name="edit-2" size={15} color={colors.primary} />
          </Pressable>
        </View>
        <InfoRow icon="phone" label="Phone" value={userProfile?.phone || "Not set"} colors={colors} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardHeaderTitle, { color: colors.foreground }]}>Next of Kin</Text>
          <Pressable onPress={() => router.push("/edit-profile")}>
            <Feather name="edit-2" size={15} color={colors.primary} />
          </Pressable>
        </View>
        {nextOfKin ? (
          <>
            <InfoRow icon="user" label="Name" value={nextOfKin.name} colors={colors} />
            <InfoRow icon="phone" label="Phone" value={nextOfKin.phone} colors={colors} />
            <InfoRow icon="heart" label="Relationship" value={nextOfKin.relationship} colors={colors} />
          </>
        ) : (
          <Text style={[styles.emptyNokText, { color: colors.mutedForeground }]}>
            No next of kin on file yet. Add one from Edit Profile.
          </Text>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <ProfileRow label="Delete Account" icon="trash-2" onPress={() => router.push("/delete-account")} danger colors={colors} />
        <ProfileRow label="Sign Out" icon="log-out" onPress={handleLogout} danger colors={colors} />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>EidSave v1.0.0 · Secure & Halal</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, alignItems: "center" },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "visible" },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: "700" },
  avatarEditBadge: { position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  name: { fontSize: 22, fontWeight: "700" },
  email: { fontSize: 14, marginTop: 2, marginBottom: 16 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  streakText: { fontSize: 13, fontWeight: "600" },
  card: { width: "100%", borderWidth: 1, padding: 16, marginBottom: 16, gap: 12 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeaderTitle: { fontSize: 14, fontWeight: "700" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 14, marginTop: 2 },
  emptyNokText: { fontSize: 13, lineHeight: 18 },
  completenessRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  completenessLabel: { fontSize: 14, fontWeight: "500" },
  completenessVal: { fontSize: 14, fontWeight: "700" },
  completeTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  completeBar: { height: 6, borderRadius: 3 },
  referralRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  referralLabel: { fontSize: 11 },
  referralCode: { fontSize: 18, fontWeight: "700", letterSpacing: 2, marginTop: 2 },
  copyBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  section: { width: "100%", borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15 },
  version: { fontSize: 12, marginTop: 12 },
});