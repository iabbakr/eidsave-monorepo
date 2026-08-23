import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { useGetWallet, useGetEidDates, useGetTransactions } from "@workspace/api-client-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useState } from "react";

function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function EidCard({ title, subtitle, balance, daysLeft, iconName, onPress, colors }: {
  title: string; subtitle: string; balance: number; daysLeft: number;
  iconName: "moon" | "star"; onPress: () => void; colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable style={[styles.eidCard, { backgroundColor: colors.primary }]} onPress={onPress}>
      <View style={styles.eidCardTop}>
        <View>
          <Text style={[styles.eidCardTitle, { color: colors.primaryForeground }]}>{title}</Text>
          <Text style={[styles.eidCardSub, { color: colors.primaryForeground, opacity: 0.75 }]}>{subtitle}</Text>
        </View>
        <View style={[styles.eidIconWrap, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name={iconName} size={24} color={colors.primaryForeground} />
        </View>
      </View>
      <Text style={[styles.eidBalance, { color: colors.primaryForeground }]}>{formatNaira(balance)}</Text>
      <View style={[styles.eidFooter, { borderTopColor: "rgba(255,255,255,0.15)" }]}>
        <Feather name="clock" size={12} color={colors.primaryForeground} style={{ opacity: 0.7 }} />
        <Text style={[styles.eidDays, { color: colors.primaryForeground, opacity: 0.7 }]}>
          {daysLeft > 0 ? `${daysLeft} days away` : "Eid Mubarak!"}
        </Text>
      </View>
    </Pressable>
  );
}

function TransactionRow({ tx, colors, onPress }: {
  tx: { id: string; type: string; amount: number; walletType: string; status: string; createdAt: string; reference?: string };
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const isCredit = tx.type === "deposit";
  const icons: Record<string, "arrow-down-left" | "arrow-up-right" | "shopping-bag" | "truck"> = {
    deposit: "arrow-down-left",
    withdrawal: "arrow-up-right",
    purchase: "shopping-bag",
    delivery_fee: "truck",
  };
  return (
    <Pressable style={[styles.txRow, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={[styles.txIcon, { backgroundColor: isCredit ? colors.success + "20" : colors.accent + "20" }]}>
        <Feather name={icons[tx.type] ?? "activity"} size={16} color={isCredit ? colors.success : colors.accent} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txType, { color: colors.foreground }]}>
          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1).replace("_", " ")}
        </Text>
        <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
          {new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
          {" · "}{tx.walletType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.foreground }]}>
        {isCredit ? "+" : "-"}{formatNaira(tx.amount)}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const { data: adhaWallet, refetch: refetchAdha } = useGetWallet("adha");
  const { data: fitrWallet, refetch: refetchFitr } = useGetWallet("fitr");
  const { data: eidDates, refetch: refetchEid } = useGetEidDates();
  const { data: recentAdha, refetch: refetchAdhaTx } = useGetTransactions("adha", { page: 1, limit: 3 });
  const { data: recentFitr, refetch: refetchFitrTx } = useGetTransactions("fitr", { page: 1, limit: 3 });

  const recentTxs = [
    ...(recentAdha?.transactions ?? []),
    ...(recentFitr?.transactions ?? []),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const totalBalance = (adhaWallet?.balance ?? 0) + (fitrWallet?.balance ?? 0);
  const firstName = user?.name?.split(" ")[0] ?? "Friend";

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAdha(), refetchFitr(), refetchEid(), refetchAdhaTx(), refetchFitrTx()]);
    setRefreshing(false);
  };

  const openReceipt = (tx: typeof recentTxs[0]) => {
    router.push({
      pathname: "/receipt/[id]",
      params: {
        id: tx.id,
        reference: tx.reference || tx.id,
        type: tx.type,
        amount: tx.amount.toString(),
        walletType: tx.walletType,
        date: new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        status: tx.status,
      },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>As-salamu alaykum</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{firstName}</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="bell" size={18} color={colors.foreground} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="settings" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {eidDates?.currentHijriDate ? (
        <Text style={[styles.hijri, { color: colors.mutedForeground }]}>{eidDates.currentHijriDate}</Text>
      ) : null}

      <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Savings Portfolio</Text>
        <Text style={[styles.totalBalance, { color: colors.foreground }]}>{formatNaira(totalBalance)}</Text>
        <View style={styles.actionButtonsRow}>
          <Pressable
            style={[styles.depositBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => router.push("/deposit")}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
            <Text style={[styles.depositBtnText, { color: colors.primaryForeground }]}>Deposit</Text>
          </Pressable>
          <Pressable
            style={[styles.withdrawBtn, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
            onPress={() => router.push("/withdraw")}
          >
            <Feather name="arrow-up-right" size={18} color={colors.foreground} />
            <Text style={[styles.withdrawBtnText, { color: colors.foreground }]}>Withdraw</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Eid Accounts</Text>
      <View style={styles.eidCards}>
        <EidCard
          title="Eid al-Adha"
          subtitle="Animal Sacrifice Savings"
          balance={adhaWallet?.balance ?? 0}
          daysLeft={eidDates?.adha?.daysUntilEid ?? 0}
          iconName="moon"
          onPress={() => router.push("/(tabs)/adha")}
          colors={colors}
        />
        <EidCard
          title="Eid al-Fitr"
          subtitle="Group Cow & Meat Savings"
          balance={fitrWallet?.balance ?? 0}
          daysLeft={eidDates?.fitr?.daysUntilEid ?? 0}
          iconName="star"
          onPress={() => router.push("/(tabs)/fitr")}
          colors={colors}
        />
      </View>

      {recentTxs.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
            <Pressable onPress={() => router.push("/transactions")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          <View style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {recentTxs.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} colors={colors} onPress={() => openReceipt(tx)} />
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  topActions: { flexDirection: "row", gap: 8 },
  greeting: { fontSize: 13 },
  name: { fontSize: 24, fontWeight: "700" },
  hijri: { fontSize: 12, marginBottom: 20 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 24, marginTop: 4, gap: 4 },
  totalLabel: { fontSize: 13 },
  totalBalance: { fontSize: 32, fontWeight: "700", marginBottom: 16 },
  actionButtonsRow: { flexDirection: "row", gap: 10 },
  depositBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48 },
  depositBtnText: { fontSize: 15, fontWeight: "600" },
  withdrawBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48 },
  withdrawBtnText: { fontSize: 15, fontWeight: "600" },
  sectionTitle: { fontSize: 17, fontWeight: "600", marginBottom: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 14 },
  eidCards: { gap: 12, marginBottom: 28 },
  eidCard: { borderRadius: 16, padding: 20, gap: 8 },
  eidCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eidCardTitle: { fontSize: 16, fontWeight: "700" },
  eidCardSub: { fontSize: 12, marginTop: 2 },
  eidIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  eidBalance: { fontSize: 26, fontWeight: "700" },
  eidFooter: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  eidDays: { fontSize: 12 },
  txCard: { borderWidth: 1, overflow: "hidden" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontWeight: "500" },
  txDate: { fontSize: 12, marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: "600" },
});