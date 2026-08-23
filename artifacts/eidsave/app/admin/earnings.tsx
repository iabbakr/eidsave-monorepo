import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetAdminEarnings, GetAdminEarningsPeriod } from "@workspace/api-client-react";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });
const PERIODS: GetAdminEarningsPeriod[] = ["week", "month", "year"];

export default function AdminEarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<GetAdminEarningsPeriod>("month");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetAdminEarnings({ period });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const maxBar = Math.max(...(data?.periodBreakdown.map((p) => p.deposits) ?? [1]), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <AdminHeader title="Earnings" backTo="/admin" />

      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            style={[styles.periodChip, { backgroundColor: period === p ? colors.primary : colors.muted, borderRadius: colors.radius }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, { color: period === p ? colors.primaryForeground : colors.foreground }]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total Deposits</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatNaira(data?.totalDeposits ?? 0)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Withdrawals</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatNaira(data?.totalWithdrawals ?? 0)}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.netLabel, { color: colors.mutedForeground }]}>Net Revenue</Text>
            <Text style={[styles.netValue, { color: colors.foreground }]}>{formatNaira(data?.netRevenue ?? 0)}</Text>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Adha Deposits</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatNaira(data?.adhaDeposits ?? 0)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Fitr Deposits</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatNaira(data?.fitrDeposits ?? 0)}</Text>
            </View>
          </View>

          <View style={[styles.topState, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.topStateLabel, { color: colors.mutedForeground }]}>Top State by Deposits</Text>
            <Text style={[styles.topStateValue, { color: colors.foreground }]}>{data?.topStateByDeposit ?? "N/A"}</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Period Breakdown</Text>
          <View style={[styles.chart, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {(data?.periodBreakdown ?? []).map((point) => (
              <View key={point.label} style={styles.barCol}>
                <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(4, (point.deposits / maxBar) * 100)}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{point.label}</Text>
                <Text style={[styles.barValue, { color: colors.foreground }]} numberOfLines={1}>
                  {formatNaira(point.net)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8 },
  periodText: { fontSize: 13, fontWeight: "600" },
  loadingWrap: { padding: 40, alignItems: "center" },
  summaryCard: { borderWidth: 1, padding: 16, gap: 12, marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  netLabel: { fontSize: 12 },
  netValue: { fontSize: 24, fontWeight: "700" },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statBox: { flex: 1, borderWidth: 1, padding: 14, gap: 4 },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 15, fontWeight: "700" },
  topState: { borderWidth: 1, padding: 14, marginBottom: 20 },
  topStateLabel: { fontSize: 12 },
  topStateValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  chart: { borderWidth: 1, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", minHeight: 180 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: { width: 24, height: 100, borderRadius: 4, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 10 },
  barValue: { fontSize: 9, maxWidth: 48, textAlign: "center" },
});
