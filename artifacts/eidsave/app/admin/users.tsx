import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable, TextInput, Alert, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetAdminUsers, useUpdateUserStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import * as Haptics from "expo-haptics";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useGetAdminUsers({ q: search || undefined, page });
  const updateStatus = useUpdateUserStatus();

  const users = data?.users ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleActive = (userId: string, name: string, isActive: boolean) => {
    Alert.alert(
      isActive ? "Deactivate User" : "Activate User",
      `${isActive ? "Deactivate" : "Activate"} ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({ id: userId, data: { isActive: !isActive } });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/users"] });
            } catch {
              Alert.alert("Error", "Failed to update user status");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 16 }]}>
        <AdminHeader title="Users" backTo="/admin" />
        <TextInput
          style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
          placeholder="Search by name, email or phone"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={(text) => { setSearch(text); setPage(1); }}
        />
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {data?.total ?? 0} savers · Page {data?.page ?? 1} of {data?.totalPages ?? 1}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.email}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.phone}{item.state ? ` · ${item.state}` : ""}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: item.role === "admin" ? colors.primary + "20" : colors.muted }]}>
                  <Text style={[styles.roleText, { color: item.role === "admin" ? colors.primary : colors.mutedForeground }]}>{item.role}</Text>
                </View>
              </View>
              <View style={styles.balances}>
                <Text style={[styles.balance, { color: colors.foreground }]}>Adha: {formatNaira(item.adhaBalance)}</Text>
                <Text style={[styles.balance, { color: colors.foreground }]}>Fitr: {formatNaira(item.fitrBalance)}</Text>
              </View>
              <View style={styles.activeRow}>
                <Text style={[styles.activeLabel, { color: colors.foreground }]}>Account active</Text>
                <Switch
                  value={item.isActive}
                  onValueChange={() => toggleActive(item.id, item.name, item.isActive)}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No users found</Text>
            </View>
          }
          ListFooterComponent={
            (data?.totalPages ?? 1) > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  style={[styles.pageBtn, { backgroundColor: colors.muted, borderRadius: colors.radius, opacity: page <= 1 ? 0.5 : 1 }]}
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={[styles.pageBtnText, { color: colors.foreground }]}>Previous</Text>
                </Pressable>
                <Pressable
                  style={[styles.pageBtn, { backgroundColor: colors.muted, borderRadius: colors.radius, opacity: page >= (data?.totalPages ?? 1) ? 0.5 : 1 }]}
                  disabled={page >= (data?.totalPages ?? 1)}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Text style={[styles.pageBtnText, { color: colors.foreground }]}>Next</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: 20 },
  search: { borderWidth: 1, paddingHorizontal: 14, height: 44, fontSize: 14, marginBottom: 8 },
  count: { fontSize: 12, marginBottom: 12 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 12 },
  card: { borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  balances: { flexDirection: "row", gap: 16 },
  balance: { fontSize: 13, fontWeight: "500" },
  activeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeLabel: { fontSize: 14 },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { fontSize: 14 },
  pagination: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 16 },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  pageBtnText: { fontSize: 13, fontWeight: "600" },
});
