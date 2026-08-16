import { View, Text, StyleSheet, Pressable, ScrollView, Image, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetAnimals } from "@workspace/api-client-react";
import { useState } from "react";

const CATEGORIES = ["All", "Ram", "Goat", "Cow"];

const LOCAL_IMAGES: Record<string, ReturnType<typeof require>> = {
  Ram: require("@/assets/images/ram.png"),
  Goat: require("@/assets/images/goat.png"),
  Cow: require("@/assets/images/cow.png"),
};

const MOCK_ANIMALS = [
  {
    id: "mock-ram-1", name: "Sokoto Gudali Ram", category: "Ram" as const,
    description: "Premium Sokoto Gudali ram, well-fed and healthy.",
    imageUrl: "", sizes: [
      { label: "Small", weight: "15–20kg", price: 45000 },
      { label: "Medium", weight: "20–30kg", price: 75000 },
      { label: "Large", weight: "30–40kg", price: 120000 },
      { label: "XL", weight: "40kg+", price: 180000 },
    ],
    isAvailable: true, stock: "available" as const, eidType: "adha" as const, createdAt: "",
  },
  {
    id: "mock-goat-1", name: "West African Dwarf Goat", category: "Goat" as const,
    description: "Healthy West African Dwarf goat, well-raised on natural feed.",
    imageUrl: "", sizes: [
      { label: "Small", weight: "15–20kg", price: 35000 },
      { label: "Medium", weight: "20–30kg", price: 55000 },
    ],
    isAvailable: true, stock: "available" as const, eidType: "adha" as const, createdAt: "",
  },
  {
    id: "mock-cow-1", name: "Bunaji White Cow", category: "Cow" as const,
    description: "Premium Bunaji white cow, excellent for group Eid al-Fitr purchases.",
    imageUrl: "", sizes: [
      { label: "Small Share (1/7)", weight: "~40kg meat", price: 150000 },
      { label: "Full Cow", weight: "280kg live", price: 600000 },
    ],
    isAvailable: true, stock: "available" as const, eidType: "fitr" as const, createdAt: "",
  },
];

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

function AnimalCard({ animal, onPress, colors }: {
  animal: typeof MOCK_ANIMALS[0];
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const minPrice = Math.min(...animal.sizes.map(s => s.price));
  const maxPrice = Math.max(...animal.sizes.map(s => s.price));
  const img = LOCAL_IMAGES[animal.category];

  return (
    <Pressable
      style={[styles.animalCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      onPress={onPress}
    >
      <View style={[styles.animalImgWrap, { backgroundColor: colors.muted }]}>
        {img ? (
          <Image source={img} style={styles.animalImg} resizeMode="cover" />
        ) : (
          <Feather name="box" size={32} color={colors.mutedForeground} />
        )}
        {(animal.stock as string) === "limited" && (
          <View style={[styles.limitedBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.limitedText}>Limited</Text>
          </View>
        )}
      </View>
      <View style={styles.animalInfo}>
        <Text style={[styles.animalName, { color: colors.foreground }]} numberOfLines={1}>{animal.name}</Text>
        <Text style={[styles.animalCategory, { color: colors.mutedForeground }]}>{animal.category}</Text>
        <Text style={[styles.animalPrice, { color: colors.primary }]}>
          {formatNaira(minPrice)} – {formatNaira(maxPrice)}
        </Text>
        <View style={styles.sizePills}>
          {animal.sizes.slice(0, 3).map((s) => (
            <View key={s.label} style={[styles.sizePill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.sizePillText, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
          {animal.sizes.length > 3 && (
            <Text style={[styles.moreSizes, { color: colors.mutedForeground }]}>+{animal.sizes.length - 3}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function CatalogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetAnimals();

  const animals = (data?.animals && data.animals.length > 0 ? data.animals : MOCK_ANIMALS) as typeof MOCK_ANIMALS;
  const filtered = selectedCategory === "All" ? animals : animals.filter((a) => a.category === selectedCategory);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Animal Catalog</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Select and save toward your sacrifice</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoriesRow, { paddingHorizontal: 20 }]}
        style={styles.categoriesScroll}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.catPill,
              {
                backgroundColor: selectedCategory === cat ? colors.primary : colors.card,
                borderColor: selectedCategory === cat ? colors.primary : colors.border,
                borderRadius: 20,
              },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.catText, { color: selectedCategory === cat ? colors.primaryForeground : colors.foreground }]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <AnimalCard
              animal={item}
              onPress={() => router.push(`/animal/${item.id}`)}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="box" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No animals in this category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  pageTitle: { fontSize: 26, fontWeight: "700" },
  pageSub: { fontSize: 13, marginTop: 2 },
  categoriesScroll: { maxHeight: 56 },
  categoriesRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 8 },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  catText: { fontSize: 14, fontWeight: "500" },
  grid: { paddingHorizontal: 20, paddingTop: 12 },
  gridRow: { gap: 12, marginBottom: 12 },
  animalCard: { flex: 1, borderWidth: 1, overflow: "hidden" },
  animalImgWrap: { height: 130, alignItems: "center", justifyContent: "center", position: "relative" },
  animalImg: { width: "100%", height: "100%" },
  limitedBadge: { position: "absolute", top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  limitedText: { fontSize: 10, color: "#fff", fontWeight: "600" },
  animalInfo: { padding: 12, gap: 3 },
  animalName: { fontSize: 13, fontWeight: "600" },
  animalCategory: { fontSize: 11 },
  animalPrice: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  sizePills: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 6 },
  sizePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sizePillText: { fontSize: 10 },
  moreSizes: { fontSize: 10 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14 },
});
