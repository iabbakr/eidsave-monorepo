import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetWallet, useGetEidDates } from "@workspace/api-client-react";
import { useState } from "react";

const formatNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

export default function FitrScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: wallet, refetch: refetchWallet } = useGetWallet("fitr");
  const { data: eidDates, refetch: refetchEid } = useGetEidDates();

  const balance = wallet?.balance ?? 0;
  const target = wallet?.targetAmount ?? 100000;
  const progress = Math.min((balance / target) * 100, 100);
  const daysLeft = eidDates?.fitr?.daysUntilEid ?? 0;
  const eidDate = eidDates?.fitr?.eidDate;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWallet(), refetchEid()]);
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
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Save & Withdraw for Fitr</Text>
        </View>
        <View style={[styles.daysBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <Feather name="clock" size={12} color={colors.primary} />
          <Text style={[styles.daysText, { color: colors.primary }]}>{daysLeft}d</Text>
        </View>
      </View>

      <View style={[styles.walletCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Fitr Balance</Text>
        <Text style={[styles.walletBalance, { color: colors.foreground }]}>{formatNaira(balance)}</Text>

        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {progress.toFixed(0)}% of {formatNaira(target)} target
          </Text>
        </View>

        <View style={styles.walletActions}>
          <Pressable
            style={[styles.walletBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => router.push({ pathname: "/deposit", params: { wallet: "fitr" } })}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[styles.walletBtnText, { color: colors.primaryForeground }]}>Deposit</Text>
          </Pressable>
          <Pressable
            style={[styles.walletBtn, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
            onPress={() => router.push({ pathname: "/withdraw", params: { wallet: "fitr" } })}
          >
            <Feather name="arrow-up-right" size={16} color={colors.foreground} />
            <Text style={[styles.walletBtnText, { color: colors.foreground }]}>Withdraw</Text>
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

      {eidDate ? (
        <View style={[styles.dateCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.dateItem}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Expected Date</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>
              {new Date(eidDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>
          <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />
          <View style={styles.dateItem}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Days Remaining</Text>
            <Text style={[styles.dateValue, { color: colors.primary }]}>{daysLeft} days</Text>
          </View>
        </View>
      ) : null}
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
  walletCard: { borderRadius: 20, padding: 22, marginBottom: 20, borderWidth: 1, gap: 12 },
  walletLabel: { fontSize: 13 },
  walletBalance: { fontSize: 34, fontWeight: "700" },
  progressWrap: { gap: 6, marginVertical: 4 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressBar: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12 },
  walletActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  walletBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44 },
  walletBtnText: { fontSize: 14, fontWeight: "500" },
  dateCard: { flexDirection: "row", padding: 16, borderWidth: 1, marginBottom: 24, gap: 16 },
  dateItem: { flex: 1, gap: 4 },
  dateLabel: { fontSize: 12 },
  dateValue: { fontSize: 14, fontWeight: "600" },
  dateDivider: { width: 1 },
});