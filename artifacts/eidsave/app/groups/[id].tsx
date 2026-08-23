import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetGroup, useJoinGroup, useContributeToGroup, useGetWallet } from "@workspace/api-client-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });
const SHORTCUTS = [5000, 10000, 25000, 50000];

export default function GroupDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: group, isLoading, refetch } = useGetGroup(id!);
  const { data: fitrWallet, refetch: refetchWallet } = useGetWallet("fitr");
  const joinMutation = useJoinGroup();
  const contributeMutation = useContributeToGroup();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [showContribute, setShowContribute] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.mutedForeground }]}>Group not found</Text>
      </View>
    );
  }

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync({ groupId: id! });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addNotification({
        title: "Joined Group",
        body: `You are now a member of ${group.name}.`,
        type: "group",
        reference: id,
      });
      await refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to join group";
      setError(msg);
    }
  };

  const handleContribute = async () => {
    const num = parseInt(amount.replace(/\D/g, ""), 10) || 0;
    const fitrBalance = fitrWallet?.balance ?? 0;

    if (num < 500) { setError("Minimum contribution is ₦500"); return; }
    if (num > fitrBalance) { setError(`Insufficient balance. Deposit at least ${formatNaira(num - fitrBalance)} to your Fitr wallet`); return; }
    setError("");

    try {
      await contributeMutation.mutateAsync({ groupId: id!, data: { amount: num } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addNotification({
        title: "Group Contribution Sent",
        body: `Contributed ${formatNaira(num)} to ${group.name}.`,
        type: "group",
        reference: id,
      });
      setShowContribute(false);
      setAmount("");
      await Promise.all([refetch(), refetchWallet()]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Contribution failed";
      setError(msg);
    }
  };

  const progressPercent = group.progressPercent ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]} numberOfLines={1}>{group.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.balanceLabel, { color: colors.primaryForeground, opacity: 0.75 }]}>Collected Pool</Text>
            <Text style={[styles.memberCount, { color: colors.primaryForeground, opacity: 0.75 }]}>
              {group.memberCount}/{group.memberLimit} members
            </Text>
          </View>
          <Text style={[styles.balance, { color: colors.primaryForeground }]}>{formatNaira(group.currentBalance)}</Text>
          <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: colors.gold }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.primaryForeground, opacity: 0.8 }]}>
            {progressPercent.toFixed(0)}% of {formatNaira(group.targetAmount)} target
          </Text>
        </View>

        {group.isMember && (
          <View style={[styles.myContribCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.myContribLabel, { color: colors.mutedForeground }]}>My Total Contribution</Text>
            <Text style={[styles.myContribVal, { color: colors.primary }]}>{formatNaira(group.myContribution ?? 0)}</Text>
          </View>
        )}

        {group.description ? (
          <View style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.descTitle, { color: colors.foreground }]}>Group Information</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{group.description}</Text>
          </View>
        ) : null}

        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {group.isMember ? (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => setShowContribute(true)}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
            <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Contribute from Fitr Wallet</Text>
          </Pressable>
        ) : group.status === "open" && group.memberCount < group.memberLimit ? (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={handleJoin}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="user-plus" size={18} color={colors.primaryForeground} />
                <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Join Group</Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>
              {group.memberCount >= group.memberLimit ? "Group is full" : "Group closed"}
            </Text>
          </View>
        )}
      </View>

      <Modal visible={showContribute} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: 32, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Contribute to Pool</Text>
            <Pressable onPress={() => setShowContribute(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.availText, { color: colors.mutedForeground }]}>
              Available Fitr Balance: {formatNaira(fitrWallet?.balance ?? 0)}
            </Text>
            <View style={[styles.amountWrap, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}>
              <Text style={[styles.nairaSign, { color: colors.mutedForeground }]}>₦</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.foreground }]}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/\D/g, ""))}
              />
            </View>

            <View style={styles.shortcuts}>
              {SHORTCUTS.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.shortcut, { backgroundColor: colors.muted, borderRadius: 8 }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAmount(String(s)); }}
                >
                  <Text style={[styles.shortcutText, { color: colors.foreground }]}>{formatNaira(s)}</Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, marginTop: 8 }]}
              onPress={handleContribute}
              disabled={contributeMutation.isPending}
            >
              {contributeMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Confirm Contribution</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  content: { paddingHorizontal: 20, gap: 16 },
  progressCard: { borderRadius: 20, padding: 22, gap: 10 },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  balanceLabel: { fontSize: 13 },
  memberCount: { fontSize: 13 },
  balance: { fontSize: 32, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressBar: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 12 },
  myContribCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderWidth: 1 },
  myContribLabel: { fontSize: 14 },
  myContribVal: { fontSize: 18, fontWeight: "700" },
  descCard: { padding: 16, borderWidth: 1, gap: 6 },
  descTitle: { fontSize: 14, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionBtnText: { fontSize: 16, fontWeight: "600" },
  modal: { flex: 1, paddingHorizontal: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalContent: { gap: 16 },
  availText: { fontSize: 13 },
  amountWrap: { flexDirection: "row", alignItems: "center", height: 72, borderWidth: 1, paddingHorizontal: 16 },
  nairaSign: { fontSize: 28, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "600" },
  shortcuts: { flexDirection: "row", gap: 8 },
  shortcut: { flex: 1, height: 40, alignItems: "center", justifyContent: "center" },
  shortcutText: { fontSize: 12, fontWeight: "500" },
});