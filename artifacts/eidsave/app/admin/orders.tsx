import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetAdminOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import * as Haptics from "expo-haptics";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });
const STATUSES = ["confirmed", "dispatched", "delivered"] as const;

export default function AdminOrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading, refetch } = useGetAdminOrders(
    filter === "all" ? undefined : { status: filter }
  );
  const updateStatus = useUpdateOrderStatus();

  const orders = data?.orders ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const advanceStatus = (orderId: string, current: string) => {
    const idx = STATUSES.indexOf(current as (typeof STATUSES)[number]);
    const next = idx >= 0 && idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
    if (!next) return;

    Alert.alert("Update Order", `Mark this order as "${next}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ id: orderId, data: { status: next } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/orders"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/stats"] });
          } catch {
            Alert.alert("Error", "Failed to update order status");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 16 }]}>
        <AdminHeader title="Orders" backTo="/admin" />
        <View style={styles.filters}>
          {["all", "confirmed", "dispatched", "delivered"].map((s) => (
            <Pressable
              key={s}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === s ? colors.primary : colors.muted,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterText, { color: filter === s ? colors.primaryForeground : colors.foreground }]}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{item.animalName}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {item.size} · Qty {item.quantity} · {item.eidType.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.accent + "20" }]}>
                  <Text style={[styles.badgeText, { color: colors.accent }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.price, { color: colors.foreground }]}>
                {formatNaira(item.totalPrice + item.deliveryFee)}
              </Text>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {new Date(item.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
              {item.status !== "delivered" && (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: updateStatus.isPending ? 0.7 : 1 }]}
                  onPress={() => advanceStatus(item.id, item.status)}
                  disabled={updateStatus.isPending}
                >
                  <Text style={[styles.actionText, { color: colors.primaryForeground }]}>
                    {item.status === "pending" ? "Confirm Order" : item.status === "confirmed" ? "Mark Dispatched" : "Mark Delivered"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No orders found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: 20 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { fontSize: 12, fontWeight: "600" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 12 },
  card: { borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  price: { fontSize: 16, fontWeight: "700" },
  date: { fontSize: 12 },
  actionBtn: { marginTop: 4, height: 40, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 13, fontWeight: "600" },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { fontSize: 14 },
});
