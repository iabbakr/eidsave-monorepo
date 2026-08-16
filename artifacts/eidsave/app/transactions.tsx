import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetTransactions } from "@workspace/api-client-react";
import { useState } from "react";

type Filter = "all" | "deposit" | "withdrawal" | "purchase";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "deposit", label: "Deposits" },
  { id: "withdrawal", label: "Withdrawals" },
  { id: "purchase", label: "Purchases" },
];

const iconMap: Record<string, "arrow-down-left" | "arrow-up-right" | "shopping-bag" | "truck"> = {
  deposit: "arrow-down-left",
  withdrawal: "arrow-up-right",
  purchase: "shopping-bag",
  delivery_fee: "truck",
};

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: adhaData, isLoading: adhaLoading, refetch: refetchAdha } = useGetTransactions("adha", { page: 1, limit: 50 });
  const { data: fitrData, refetch: refetchFitr } = useGetTransactions("fitr", { page: 1, limit: 50 });

  const allTxs = [
    ...(adhaData?.transactions ?? []),
    ...(fitrData?.transactions ?? []),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = filter === "all" ? allTxs : allTxs.filter((t) => t.type === filter);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAdha(), refetchFitr()]);
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Transactions</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === f.id ? colors.primary : colors.card,
                borderColor: filter === f.id ? colors.primary : colors.border,
                borderRadius: 16,
              },
            ]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, { color: filter === f.id ? colors.primaryForeground : colors.foreground }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {adhaLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const isCredit = item.type === "deposit";
            return (
              <View style={[styles.txRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.txIcon, { backgroundColor: isCredit ? colors.success + "20" : colors.accent + "20" }]}>
                  <Feather name={iconMap[item.type] ?? "activity"} size={18} color={isCredit ? colors.success : colors.accent} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txType, { color: colors.foreground }]}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1).replace("_", " ")}
                  </Text>
                  <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>
                    {new Date(item.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{item.walletType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.foreground }]}>
                    {isCredit ? "+" : "-"}{formatNaira(item.amount)}
                  </Text>
                  <View style={[styles.statusBadge, {
                    backgroundColor: item.status === "success" ? colors.success + "15" : colors.accent + "15"
                  }]}>
                    <Text style={[styles.statusText, {
                      color: item.status === "success" ? colors.success : colors.accent
                    }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="activity" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions yet</Text>
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
  filtersRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: "500" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 8 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontWeight: "500" },
  txMeta: { fontSize: 12, marginTop: 2 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 14, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 14 },
});
