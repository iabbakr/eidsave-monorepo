import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useGetAdminStats, useGetAdminOrders } from "@workspace/api-client-react";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminMenuCard } from "@/components/admin/AdminMenuCard";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

export default function AdminDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetAdminStats();
  const { data: ordersData, refetch: refetchOrders } = useGetAdminOrders();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchOrders()]);
    setRefreshing(false);
  };

  const pendingOrders = (ordersData?.orders ?? []).filter((o) => o.status !== "delivered").slice(0, 5);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <AdminHeader title="Admin Dashboard" />

      {statsLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Platform Balance</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{formatNaira(stats?.totalPlatformBalance ?? 0)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Registered Savers</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats?.totalUsers ?? 0}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statBoxHalf, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Adha Pool</Text>
                <Text style={[styles.statValueSm, { color: colors.foreground }]}>{formatNaira(stats?.totalAdhaBalance ?? 0)}</Text>
              </View>
              <View style={[styles.statBoxHalf, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Fitr Pool</Text>
                <Text style={[styles.statValueSm, { color: colors.foreground }]}>{formatNaira(stats?.totalFitrBalance ?? 0)}</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statBoxHalf, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Today's Deposits</Text>
                <Text style={[styles.statValueSm, { color: colors.foreground }]}>{formatNaira(stats?.todayDeposits ?? 0)}</Text>
              </View>
              <View style={[styles.statBoxHalf, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pending Delivery</Text>
                <Text style={[styles.statValueSm, { color: colors.foreground }]}>{stats?.pendingDeliveries ?? 0}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Management</Text>
          <View style={styles.menuList}>
            <AdminMenuCard
              title="Orders"
              subtitle="Fulfill and track deliveries"
              icon="package"
              badge={stats?.activeOrders}
              onPress={() => router.push("/admin/orders")}
            />
            <AdminMenuCard
              title="Users"
              subtitle="Search savers and manage access"
              icon="users"
              onPress={() => router.push("/admin/users")}
            />
            <AdminMenuCard
              title="Animal Catalog"
              subtitle="Add and update listings"
              icon="box"
              onPress={() => router.push("/admin/animals")}
            />
            <AdminMenuCard
              title="Support Tickets"
              subtitle="Respond to user inquiries"
              icon="message-circle"
              onPress={() => router.push("/admin/tickets")}
            />
            <AdminMenuCard
              title="Earnings"
              subtitle="Deposits, withdrawals & trends"
              icon="trending-up"
              onPress={() => router.push("/admin/earnings")}
            />
            <AdminMenuCard
              title="Broadcast"
              subtitle="Send push notifications"
              icon="bell"
              onPress={() => router.push("/admin/broadcast")}
            />
            <AdminMenuCard
              title="Tools"
              subtitle="Cache flush and maintenance"
              icon="tool"
              onPress={() => router.push("/admin/tools")}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>Pending Fulfillment ({stats?.activeOrders ?? 0})</Text>
          <View style={[styles.ordersList, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {pendingOrders.map((o, idx) => (
              <View
                key={o.id}
                style={[
                  styles.orderRow,
                  { borderBottomColor: colors.border, borderBottomWidth: idx < pendingOrders.length - 1 ? StyleSheet.hairlineWidth : 0 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderAnimal, { color: colors.foreground }]}>{o.animalName} ({o.size})</Text>
                  <Text style={[styles.orderSub, { color: colors.mutedForeground }]}>Qty: {o.quantity} · {o.eidType.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.accent + "20" }]}>
                  <Text style={[styles.statusText, { color: colors.accent }]}>{o.status}</Text>
                </View>
              </View>
            ))}
            {pendingOrders.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>All orders fulfilled</Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  loadingWrap: { padding: 40, alignItems: "center" },
  statsGrid: { gap: 10, marginBottom: 24 },
  statBox: { padding: 16, borderWidth: 1, gap: 4 },
  statRow: { flexDirection: "row", gap: 10 },
  statBoxHalf: { flex: 1, padding: 14, borderWidth: 1, gap: 4 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 22, fontWeight: "700" },
  statValueSm: { fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  menuList: { gap: 10 },
  ordersList: { borderWidth: 1, overflow: "hidden" },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  orderAnimal: { fontSize: 14, fontWeight: "600" },
  orderSub: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  emptyWrap: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 13 },
});
