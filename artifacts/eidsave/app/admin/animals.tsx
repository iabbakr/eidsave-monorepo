import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetAnimals } from "@workspace/api-client-react";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

export default function AdminAnimalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetAnimals();
  const animals = data?.animals ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 16 }]}>
        <AdminHeader title="Animal Catalog" backTo="/admin" />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={animals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const prices = item.sizes?.map((s) => s.price) ?? [0];
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            return (
              <Pressable
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => router.push({ pathname: "/admin/animal-form", params: { id: item.id } })}
              >
                <View style={[styles.thumb, { backgroundColor: colors.muted }]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.thumbImg} />
                  ) : (
                    <Feather name="box" size={24} color={colors.mutedForeground} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {item.category} · {item.eidType} · {item.stock}
                  </Text>
                  <Text style={[styles.price, { color: colors.primary }]}>
                    {minPrice === maxPrice ? formatNaira(minPrice) : `${formatNaira(minPrice)} – ${formatNaira(maxPrice)}`}
                  </Text>
                </View>
                <Feather name="edit-2" size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No animals listed yet</Text>
            </View>
          }
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        onPress={() => router.push("/admin/animal-form")}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: 20 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  name: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  price: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { fontSize: 14 },
  fab: { position: "absolute", right: 24, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 4 },
});
