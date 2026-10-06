import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetUserProfile } from "@workspace/api-client-react";

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
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

export default function AccountInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: userProfile } = useGetUserProfile();

  const profileComplete = userProfile?.profileComplete ?? 70;
  const nextOfKin = userProfile?.nextOfKin;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Account Information</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Completeness */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.completenessRow}>
            <Text style={[styles.completenessLabel, { color: colors.foreground }]}>Profile completeness</Text>
            <Text style={[styles.completenessVal, { color: colors.primary }]}>{profileComplete}%</Text>
          </View>
          <View style={[styles.completeTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.completeBar, { width: `${profileComplete}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Account Details */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardHeaderTitle, { color: colors.foreground }]}>Personal Details</Text>
            <Pressable onPress={() => router.push("/edit-profile")}>
              <Feather name="edit-2" size={15} color={colors.primary} />
            </Pressable>
          </View>
          <InfoRow icon="user" label="Full Name" value={userProfile?.name || "—"} colors={colors} />
          <InfoRow icon="mail" label="Email" value={userProfile?.email || "—"} colors={colors} />
          <InfoRow icon="phone" label="Phone" value={userProfile?.phone || "Not set"} colors={colors} />
        </View>

        {/* Next of Kin */}
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
              No next of kin on file yet. Tap edit to add details.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 20, gap: 16 },
  card: { width: "100%", borderWidth: 1, padding: 16, gap: 12 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeaderTitle: { fontSize: 14, fontWeight: "700" },
  completenessRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  completenessLabel: { fontSize: 14, fontWeight: "500" },
  completenessVal: { fontSize: 14, fontWeight: "700" },
  completeTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  completeBar: { height: 6, borderRadius: 3 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 14, marginTop: 2 },
  emptyNokText: { fontSize: 13, lineHeight: 18 },
});