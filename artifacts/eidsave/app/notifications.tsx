import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { AppNotification } from "@/store/useNotificationStore";

const typeIconMap: Record<AppNotification["type"], { icon: "credit-card" | "arrow-up-right" | "package" | "users" | "shield" | "bell"; color: string }> = {
  deposit: { icon: "credit-card", color: "#2D9E5A" },
  withdrawal: { icon: "arrow-up-right", color: "#C9942A" },
  order: { icon: "package", color: "#2563EB" },
  group: { icon: "users", color: "#1A6B3A" },
  security: { icon: "shield", color: "#D94040" },
  system: { icon: "bell", color: "#6B6357" },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  const handlePressNotification = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.type === "deposit" || notif.type === "withdrawal") {
      router.push("/transactions");
    } else if (notif.type === "order") {
      router.push("/orders");
    } else if (notif.type === "group" && notif.reference) {
      router.push(`/groups/${notif.reference}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Notifications</Text>
        {notifications.length > 0 ? (
          <Pressable onPress={markAllAsRead} style={styles.actionBtn}>
            <Feather name="check-square" size={18} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const conf = typeIconMap[item.type] ?? typeIconMap.system;
          return (
            <Pressable
              style={[
                styles.notifCard,
                {
                  backgroundColor: item.read ? colors.card : colors.primary + "08",
                  borderColor: item.read ? colors.border : colors.primary + "30",
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => handlePressNotification(item)}
            >
              <View style={[styles.notifIcon, { backgroundColor: conf.color + "15" }]}>
                <Feather name={conf.icon} size={18} color={conf.color} />
              </View>
              <View style={styles.notifInfo}>
                <View style={styles.titleRow}>
                  <Text style={[styles.notifTitle, { color: colors.foreground, fontWeight: item.read ? "600" : "700" }]}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.notifBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                <Text style={[styles.notifDate, { color: colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleDateString("en-NG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Transaction updates and group activities will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  actionBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  list: { paddingHorizontal: 20, gap: 10 },
  notifCard: { flexDirection: "row", padding: 14, borderWidth: 1, gap: 12 },
  notifIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  notifInfo: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  notifTitle: { fontSize: 14 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifBody: { fontSize: 13, lineHeight: 18 },
  notifDate: { fontSize: 11, marginTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 100, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});