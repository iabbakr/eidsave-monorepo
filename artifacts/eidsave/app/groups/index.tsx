import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetGroups } from "@workspace/api-client-react";
import { useState } from "react";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetGroups();
  const groups = data?.groups ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Groups</Text>
        <Pressable
          style={[styles.createBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={() => router.push("/groups/create")}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <View style={[styles.infoBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "20" }]}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.primary }]}>
          Split a full cow with up to 7 families for Eid al-Fitr
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              onPress={() => router.push(`/groups/${item.id}`)}
            >
              <View style={styles.groupTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.groupSub, { color: colors.mutedForeground }]}>
                    {item.memberCount}/{item.memberLimit} members
                    {item.isMember ? " · You're a member" : ""}
                  </Text>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: item.status === "open" ? colors.success + "15" : colors.muted,
                }]}>
                  <Text style={[styles.statusText, {
                    color: item.status === "open" ? colors.success : colors.mutedForeground,
                  }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                <View style={[styles.progressBar, { width: `${item.progressPercent}%`, backgroundColor: colors.primary }]} />
              </View>

              <View style={styles.groupFooter}>
                <Text style={[styles.groupBalance, { color: colors.foreground }]}>
                  {formatNaira(item.currentBalance)}{" "}
                  <Text style={[styles.groupTarget, { color: colors.mutedForeground }]}>of {formatNaira(item.targetAmount)}</Text>
                </Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No groups yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Create or join a group to share the cost of an Eid cow
              </Text>
              <Pressable
                style={[styles.createGroupBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => {}}
              >
                <Feather name="plus" size={16} color={colors.primaryForeground} />
                <Text style={[styles.createGroupBtnText, { color: colors.primaryForeground }]}>Create a Group</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  createBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  infoText: { fontSize: 13, flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 12 },
  groupCard: { borderWidth: 1, padding: 16, gap: 10 },
  groupTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  groupName: { fontSize: 15, fontWeight: "600" },
  groupSub: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressBar: { height: 6, borderRadius: 3 },
  groupFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupBalance: { fontSize: 14, fontWeight: "600" },
  groupTarget: { fontWeight: "400" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  createGroupBtn: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, height: 48 },
  createGroupBtnText: { fontSize: 14, fontWeight: "600" },
});
