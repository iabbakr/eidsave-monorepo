import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetWallet, useGetGroups, useGetEidDates } from "@workspace/api-client-react";
import { useState } from "react";

const formatNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

const MODES = [
  { id: "group", label: "Group Cow", sub: "Split a full cow with up to 7 families", icon: "users" as const },
  { id: "individual", label: "Individual Meat", sub: "Buy a portion of cow/meat for yourself", icon: "shopping-bag" as const },
  { id: "withdraw", label: "Save to Withdraw", sub: "Withdraw cash during Eid season", icon: "arrow-up-right" as const },
];

export default function FitrScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: wallet, refetch: refetchWallet } = useGetWallet("fitr");
  const { data: groupsData, refetch: refetchGroups } = useGetGroups();
  const { data: eidDates, refetch: refetchEid } = useGetEidDates();

  const balance = wallet?.balance ?? 0;
  const mode = wallet?.mode ?? "group";
  const daysLeft = eidDates?.fitr?.daysUntilEid ?? 0;

  const myGroups = (groupsData?.groups ?? []).filter((g) => g.isMember);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWallet(), refetchGroups(), refetchEid()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Eid al-Fitr</Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Group Cow & Meat Savings</Text>
        </View>
        <View style={[styles.daysBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <Feather name="clock" size={12} color={colors.primary} />
          <Text style={[styles.daysText, { color: colors.primary }]}>{daysLeft}d</Text>
        </View>
      </View>

      <View style={[styles.walletCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Fitr Balance</Text>
        <Text style={[styles.walletBalance, { color: colors.foreground }]}>{formatNaira(balance)}</Text>
        <View style={styles.walletActions}>
          <Pressable
            style={[styles.walletBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => router.push("/deposit")}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[styles.walletBtnText, { color: colors.primaryForeground }]}>Deposit</Text>
          </Pressable>
          <Pressable
            style={[styles.walletBtn, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
            onPress={() => router.push("/transactions")}
          >
            <Feather name="list" size={16} color={colors.foreground} />
            <Text style={[styles.walletBtnText, { color: colors.foreground }]}>History</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How do you want to use this?</Text>
      <View style={styles.modes}>
        {MODES.map((m) => (
          <View
            key={m.id}
            style={[
              styles.modeCard,
              {
                backgroundColor: mode === m.id ? colors.primary + "10" : colors.card,
                borderColor: mode === m.id ? colors.primary : colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.modeIcon, { backgroundColor: mode === m.id ? colors.primary : colors.muted }]}>
              <Feather name={m.icon} size={18} color={mode === m.id ? colors.primaryForeground : colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeLabel, { color: colors.foreground }]}>{m.label}</Text>
              <Text style={[styles.modeSub, { color: colors.mutedForeground }]}>{m.sub}</Text>
            </View>
            {mode === m.id && <Feather name="check-circle" size={20} color={colors.primary} />}
          </View>
        ))}
      </View>

      {mode === "group" && (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Groups</Text>
            <Pressable onPress={() => router.push("/groups")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Browse all</Text>
            </Pressable>
          </View>

          {myGroups.length > 0 ? (
            myGroups.map((g) => (
              <Pressable
                key={g.id}
                style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => router.push(`/groups/${g.id}`)}
              >
                <View style={styles.groupTop}>
                  <Text style={[styles.groupName, { color: colors.foreground }]}>{g.name}</Text>
                  <Text style={[styles.groupMembers, { color: colors.mutedForeground }]}>
                    {g.memberCount}/{g.memberLimit} members
                  </Text>
                </View>
                <View style={[styles.groupTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.groupProgress, { width: `${g.progressPercent}%`, backgroundColor: colors.primary }]} />
                </View>
                <View style={styles.groupFooter}>
                  <Text style={[styles.groupBalance, { color: colors.mutedForeground }]}>
                    {formatNaira(g.currentBalance)} of {formatNaira(g.targetAmount)}
                  </Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </View>
              </Pressable>
            ))
          ) : (
            <View style={[styles.emptyGroups, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="users" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No groups yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Join or create a group to split a cow with family and friends
              </Text>
              <Pressable
                style={[styles.joinBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => router.push("/groups")}
              >
                <Text style={[styles.joinBtnText, { color: colors.primaryForeground }]}>Find a Group</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: "700" },
  pageSub: { fontSize: 13, marginTop: 2 },
  daysBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  daysText: { fontSize: 13, fontWeight: "600" },
  walletCard: { borderRadius: 20, padding: 22, marginBottom: 24, borderWidth: 1, gap: 8 },
  walletLabel: { fontSize: 13 },
  walletBalance: { fontSize: 34, fontWeight: "700", marginBottom: 8 },
  walletActions: { flexDirection: "row", gap: 10 },
  walletBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44 },
  walletBtnText: { fontSize: 14, fontWeight: "500" },
  sectionTitle: { fontSize: 17, fontWeight: "600", marginBottom: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 14 },
  modes: { gap: 10, marginBottom: 28 },
  modeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderWidth: 1.5 },
  modeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modeLabel: { fontSize: 15, fontWeight: "600" },
  modeSub: { fontSize: 12, marginTop: 2 },
  groupCard: { padding: 16, borderWidth: 1, marginBottom: 12, gap: 10 },
  groupTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupName: { fontSize: 15, fontWeight: "600" },
  groupMembers: { fontSize: 12 },
  groupTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  groupProgress: { height: 6, borderRadius: 3 },
  groupFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupBalance: { fontSize: 12 },
  emptyGroups: { padding: 28, borderWidth: 1, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  joinBtn: { marginTop: 8, paddingHorizontal: 24, height: 44, alignItems: "center", justifyContent: "center" },
  joinBtnText: { fontSize: 14, fontWeight: "600" },
});