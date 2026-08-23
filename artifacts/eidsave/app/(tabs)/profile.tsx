import { View, Text, StyleSheet, Pressable, ScrollView, Share, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { useGetUserProfile } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

type FeatherIconName = "list" | "package" | "message-circle" | "settings" | "log-out" | "chevron-right" | "award" | "copy" | "credit-card";

function ProfileRow({ label, icon, onPress, danger, colors }: {
  label: string;
  icon: FeatherIconName;
  onPress: () => void;
  danger?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? colors.destructive + "15" : colors.muted }]}>
        <Feather name={icon} size={18} color={danger ? colors.destructive : colors.foreground} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const { data: userProfile } = useGetUserProfile();

  const initial = userProfile?.name?.charAt(0)?.toUpperCase() ?? "U";
  const profileComplete = userProfile?.profileComplete ?? 70;

  const handleShareReferral = async () => {
    if (!userProfile?.referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `Join me on EidSave to plan and save for your Eid sacrificial animal stress-free. Use my invite code: ${userProfile.referralCode}`,
    });
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
      <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initial}</Text>
      </View>
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

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <ProfileRow label="Transaction History" icon="list" onPress={() => router.push("/transactions")} colors={colors} />
        <ProfileRow label="My Orders" icon="package" onPress={() => router.push("/orders")} colors={colors} />
        <ProfileRow label="Withdrawal Options" icon="credit-card" onPress={() => router.push("/withdraw")} colors={colors} />
        <ProfileRow label="Support & Inquiries" icon="message-circle" onPress={() => router.push("/support")} colors={colors} />
        <ProfileRow label="Settings" icon="settings" onPress={() => router.push("/settings")} colors={colors} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <ProfileRow label="Sign Out" icon="log-out" onPress={handleLogout} danger colors={colors} />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>EidSave v1.0.0 · Secure & Halal</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, alignItems: "center" },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700" },
  email: { fontSize: 14, marginTop: 2, marginBottom: 16 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  streakText: { fontSize: 13, fontWeight: "600" },
  card: { width: "100%", borderWidth: 1, padding: 16, marginBottom: 16, gap: 12 },
  completenessRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  completenessLabel: { fontSize: 14, fontWeight: "500" },
  completenessVal: { fontSize: 14, fontWeight: "700" },
  completeTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  completeBar: { height: 6, borderRadius: 3 },
  referralRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  referralLabel: { fontSize: 11 },
  referralCode: { fontSize: 18, fontWeight: "700", letterSpacing: 2, marginTop: 2 },
  copyBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  section: { width: "100%", borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15 },
  version: { fontSize: 12, marginTop: 12 },
});