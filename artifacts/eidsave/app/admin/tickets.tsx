import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable, Alert, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetAdminTickets, useUpdateTicketStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import * as Haptics from "expo-haptics";

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

export default function AdminTicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data, isLoading, refetch } = useGetAdminTickets(
    filter === "all" ? undefined : { status: filter as (typeof STATUSES)[number] },
  );
  const updateTicket = useUpdateTicketStatus();

  const tickets = data?.tickets ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const updateStatus = (ticketId: string, status: (typeof STATUSES)[number]) => {
    Alert.alert("Update Ticket", `Set status to "${status.replace("_", " ")}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await updateTicket.mutateAsync({
              id: ticketId,
              data: {
                status,
                reply: reply.trim() || undefined,
              },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setReply("");
            setExpandedId(null);
            await queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/support/tickets"] });
          } catch {
            Alert.alert("Error", "Failed to update ticket");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 16 }]}>
        <AdminHeader title="Support Tickets" backTo="/admin" />
        <View style={styles.filters}>
          {["all", ...STATUSES].map((s) => (
            <Pressable
              key={s}
              style={[styles.filterChip, { backgroundColor: filter === s ? colors.primary : colors.muted, borderRadius: colors.radius }]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterText, { color: filter === s ? colors.primaryForeground : colors.foreground }]}>
                {s === "all" ? "All" : s.replace("_", " ")}
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
          data={tickets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const expanded = expandedId === item.id;
            return (
              <Pressable
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => setExpandedId(expanded ? null : item.id)}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.category, { color: colors.primary }]}>{item.category.replace("_", " ")}</Text>
                    <Text style={[styles.message, { color: colors.foreground }]} numberOfLines={expanded ? undefined : 2}>
                      {item.message}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.accent + "20" }]}>
                    <Text style={[styles.badgeText, { color: colors.accent }]}>{item.status.replace("_", " ")}</Text>
                  </View>
                </View>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </Text>

                {expanded && (
                  <View style={styles.expanded}>
                    {item.replies.length > 0 && (
                      <View style={[styles.replies, { backgroundColor: colors.muted + "40", borderRadius: colors.radius }]}>
                        {item.replies.map((r, i) => (
                          <Text key={i} style={[styles.replyText, { color: colors.foreground }]}>
                            <Text style={{ fontWeight: "700" }}>{r.from}: </Text>{r.message}
                          </Text>
                        ))}
                      </View>
                    )}
                    <TextInput
                      style={[styles.replyInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
                      placeholder="Optional reply to user..."
                      placeholderTextColor={colors.mutedForeground}
                      value={expandedId === item.id ? reply : ""}
                      onChangeText={setReply}
                      multiline
                    />
                    <View style={styles.actions}>
                      {STATUSES.filter((s) => s !== item.status).map((s) => (
                        <Pressable
                          key={s}
                          style={[styles.actionChip, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
                          onPress={() => updateStatus(item.id, s)}
                        >
                          <Text style={[styles.actionText, { color: colors.foreground }]}>{s.replace("_", " ")}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No tickets found</Text>
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
  filterChip: { paddingHorizontal: 10, paddingVertical: 6 },
  filterText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 10 },
  card: { borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  category: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  message: { fontSize: 14, lineHeight: 20 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  date: { fontSize: 11 },
  expanded: { gap: 10, marginTop: 4 },
  replies: { padding: 10, gap: 6 },
  replyText: { fontSize: 13, lineHeight: 18 },
  replyInput: { borderWidth: 1, padding: 10, fontSize: 14, minHeight: 60, textAlignVertical: "top" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionChip: { paddingHorizontal: 10, paddingVertical: 6 },
  actionText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { fontSize: 14 },
});
