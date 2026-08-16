import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetMyOrders } from "@workspace/api-client-react";
import { useState } from "react";

type OrderStatus = "pending" | "confirmed" | "dispatched" | "delivered";

const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string; icon: "clock" | "check" | "truck" | "check-circle" }> = {
  pending: { color: "#C9942A", bg: "#C9942A15", icon: "clock" },
  confirmed: { color: "#1A6B3A", bg: "#1A6B3A15", icon: "check" },
  dispatched: { color: "#2563EB", bg: "#2563EB15", icon: "truck" },
  delivered: { color: "#2D9E5A", bg: "#2D9E5A15", icon: "check-circle" },
};

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetMyOrders();
  const orders = data?.orders ?? [];

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
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>My Orders</Text>
        <View style={{ width: 36 }} />
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
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const status = item.status as OrderStatus;
            const conf = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
            return (
              <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={styles.orderTop}>
                  <View>
                    <Text style={[styles.orderName, { color: colors.foreground }]}>{item.animalName}</Text>
                    <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>
                      {item.size} · Qty {item.quantity} · {item.eidType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
                    <Feather name={conf.icon} size={12} color={conf.color} />
                    <Text style={[styles.statusText, { color: conf.color }]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.orderFooter}>
                  <Text style={[styles.orderPrice, { color: colors.foreground }]}>
                    {formatNaira(item.totalPrice)}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                    {new Date(item.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                </View>

                {item.recipients && item.recipients.length > 0 && (
                  <Text style={[styles.recipients, { color: colors.mutedForeground }]}>
                    {item.recipients.length} recipient{item.recipients.length > 1 ? "s" : ""}
                    {" · "}delivery fee: {formatNaira(item.deliveryFee)}
                  </Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="package" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Browse the catalog and place your first Eid order
              </Text>
              <Pressable
                style={[styles.browseBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => router.push("/(tabs)/catalog")}
              >
                <Text style={[styles.browseBtnText, { color: colors.primaryForeground }]}>Browse Catalog</Text>
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 12 },
  orderCard: { borderWidth: 1, padding: 16, gap: 12 },
  orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderName: { fontSize: 15, fontWeight: "600" },
  orderMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderPrice: { fontSize: 16, fontWeight: "700" },
  orderDate: { fontSize: 12 },
  recipients: { fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  browseBtn: { marginTop: 8, paddingHorizontal: 28, height: 48, alignItems: "center", justifyContent: "center" },
  browseBtnText: { fontSize: 14, fontWeight: "600" },
});
