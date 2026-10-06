import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetWallet, useGetMyOrders } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteAccount } from "@/hooks/useAccountActions";

export default function DeleteAccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const deleteMutation = useDeleteAccount();

  const { data: adhaWallet, isLoading: adhaLoading } = useGetWallet("adha");
  const { data: fitrWallet, isLoading: fitrLoading } = useGetWallet("fitr");
  const { data: ordersData, isLoading: ordersLoading } = useGetMyOrders();

  const [error, setError] = useState("");

  const loading = adhaLoading || fitrLoading || ordersLoading;

  const adhaBalance = adhaWallet?.balance ?? 0;
  const fitrBalance = fitrWallet?.balance ?? 0;
  const hasBalance = adhaBalance > 0 || fitrBalance > 0;

  const pendingOrder = (ordersData?.orders ?? []).find((o) => o.status !== "delivered");

  const canDelete = !loading && !hasBalance && !pendingOrder;

  const handleDelete = () => {
    Alert.alert(
      "Delete Account",
      "This is permanent. Your account will be deactivated and your personal details removed. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setError("");
            try {
              await deleteMutation.mutateAsync();
              await logout();
              router.replace("/(auth)/login");
            } catch (e: unknown) {
              const msg = (e as { message?: string })?.message ?? "Failed to delete account";
              setError(msg);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Delete Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={[styles.warnCard, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-triangle" size={20} color={colors.destructive} />
              <Text style={[styles.warnText, { color: colors.foreground }]}>
                Deleting your account is permanent. Make sure any funds are withdrawn and orders are delivered first.
              </Text>
            </View>

            <View style={[styles.checkRow, { borderColor: colors.border }]}>
              <Feather
                name={hasBalance ? "x-circle" : "check-circle"}
                size={18}
                color={hasBalance ? colors.destructive : colors.success}
              />
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                {hasBalance
                  ? "You still have a wallet balance — withdraw it first"
                  : "Both wallets are at zero balance"}
              </Text>
            </View>

            <View style={[styles.checkRow, { borderColor: colors.border }]}>
              <Feather
                name={pendingOrder ? "x-circle" : "check-circle"}
                size={18}
                color={pendingOrder ? colors.destructive : colors.success}
              />
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                {pendingOrder ? "You have an order that hasn't been delivered yet" : "No pending orders"}
              </Text>
            </View>

            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

            {!canDelete && !hasBalance === false ? null : null}

            {hasBalance ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => router.push("/withdraw")}
              >
                <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Withdraw Funds</Text>
              </Pressable>
            ) : pendingOrder ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => router.push("/orders")}
              >
                <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>View My Orders</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.destructive, borderRadius: colors.radius, opacity: deleteMutation.isPending ? 0.7 : 1 }]}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>Delete My Account</Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 20, gap: 14 },
  warnCard: { flexDirection: "row", gap: 10, padding: 14, borderWidth: 1, borderRadius: 12, alignItems: "flex-start" },
  warnText: { fontSize: 13, lineHeight: 19, flex: 1 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12 },
  checkLabel: { fontSize: 13, flex: 1 },
  error: { fontSize: 13 },
  actionBtn: { height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  actionBtnText: { fontSize: 15, fontWeight: "600" },
});