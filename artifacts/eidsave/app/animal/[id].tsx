import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetAnimal, usePlaceOrder, useGetWallet, useGetUserProfile } from "@workspace/api-client-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const LOCAL_IMAGES: Record<string, ReturnType<typeof require>> = {
  Ram: require("@/assets/images/ram.png"),
  Goat: require("@/assets/images/goat.png"),
  Cow: require("@/assets/images/cow.png"),
};

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });
const DELIVERY_FEE = 2000;

export default function AnimalDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: animal, isLoading } = useGetAnimal(id!);
  const { data: userProfile } = useGetUserProfile();
  const orderMutation = usePlaceOrder();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const eidType = animal?.eidType === "fitr" ? "fitr" : "adha";
  const { data: wallet } = useGetWallet(eidType);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!animal) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.mutedForeground }]}>Animal not found</Text>
      </View>
    );
  }

  const selectedSizeData = animal.sizes.find((s) => s.label === selectedSize);
  const unitPrice = selectedSizeData?.price ?? 0;
  const totalPrice = unitPrice * quantity;
  const totalWithDelivery = totalPrice + DELIVERY_FEE;
  const balance = wallet?.balance ?? 0;
  const canAfford = balance >= totalWithDelivery;

  const localImg = LOCAL_IMAGES[animal.category];

  const handleOrder = async () => {
    if (!selectedSize) { setError("Please select a size"); return; }
    if (!canAfford) { setError(`Insufficient balance. Deposit at least ${formatNaira(totalWithDelivery - balance)} more`); return; }
    setError("");

    try {
      const userAddr = userProfile?.address;
      const response = await orderMutation.mutateAsync({
        data: {
          animalId: animal.id,
          size: selectedSize as import("@workspace/api-client-react").PlaceOrderRequestSize,
          quantity,
          eidType: eidType as import("@workspace/api-client-react").PlaceOrderRequestEidType,
          recipients: [
            {
              name: userProfile?.name ?? "Primary Account Holder",
              phone: userProfile?.phone ?? "",
              address: {
                state: userAddr?.state ?? "FCT-Abuja",
                city: userAddr?.city ?? "Abuja",
                town: userAddr?.town,
                street: userAddr?.street ?? "Main Residential Address",
              },
            },
          ],
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addNotification({
        title: "Order Placed",
        body: `Your order for ${animal.name} (${selectedSize}) has been confirmed.`,
        type: "order",
        reference: response.id,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Order processing failed. Try again.";
      setError(msg);
    }
  };

  if (success) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background, paddingHorizontal: 32, gap: 16 }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Order Confirmed!</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Your {animal.name} ({selectedSize}) has been scheduled for slaughter & delivery.{"\n"}Receipt dispatched to your email.
        </Text>
        <Pressable
          style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={() => router.replace("/orders")}
        >
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>View My Orders</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <View style={[styles.imageWrap, { backgroundColor: colors.muted }]}>
          {animal.imageUrl ? (
            <Image source={{ uri: animal.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : localImg ? (
            <Image source={localImg} style={styles.image} resizeMode="cover" />
          ) : (
            <Feather name="box" size={48} color={colors.mutedForeground} />
          )}
        </View>

        <View style={styles.details}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.animalName, { color: colors.foreground }]}>{animal.name}</Text>
              <Text style={[styles.category, { color: colors.mutedForeground }]}>{animal.category}</Text>
            </View>
            <View style={[styles.eidBadge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.eidBadgeText, { color: colors.primary }]}>
                {eidType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.mutedForeground }]}>{animal.description}</Text>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Size</Text>
          <View style={styles.sizes}>
            {animal.sizes.map((s) => (
              <Pressable
                key={s.label}
                style={[
                  styles.sizeCard,
                  {
                    backgroundColor: selectedSize === s.label ? colors.primary : colors.card,
                    borderColor: selectedSize === s.label ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedSize(s.label); }}
              >
                <Text style={[styles.sizeLabel, { color: selectedSize === s.label ? colors.primaryForeground : colors.foreground }]}>
                  {s.label}
                </Text>
                <Text style={[styles.sizeWeight, { color: selectedSize === s.label ? colors.primaryForeground : colors.mutedForeground, opacity: 0.8 }]}>
                  {s.weight}
                </Text>
                <Text style={[styles.sizePrice, { color: selectedSize === s.label ? colors.gold : colors.primary }]}>
                  {formatNaira(s.price)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quantity</Text>
          <View style={styles.quantityRow}>
            <Pressable
              style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Feather name="minus" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.qtyValue, { color: colors.foreground }]}>{quantity}</Text>
            <Pressable
              style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Feather name="plus" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          {selectedSize && (
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Animal price</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>{formatNaira(totalPrice)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Halal Processing & Delivery</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>{formatNaira(DELIVERY_FEE)}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.foreground, fontWeight: "600" }]}>Total Required</Text>
                <Text style={[styles.summaryVal, { color: colors.primary, fontWeight: "700" }]}>{formatNaira(totalWithDelivery)}</Text>
              </View>
              {!canAfford && (
                <View style={[styles.warningRow, { backgroundColor: colors.destructive + "10" }]}>
                  <Feather name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.warningText, { color: colors.destructive }]}>
                    Need {formatNaira(totalWithDelivery - balance)} more in your {eidType === "adha" ? "Adha" : "Fitr"} wallet
                  </Text>
                </View>
              )}
            </View>
          )}

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.orderBtn, { backgroundColor: canAfford && selectedSize ? colors.primary : colors.muted, borderRadius: colors.radius }]}
          onPress={handleOrder}
          disabled={orderMutation.isPending || !selectedSize || !canAfford}
        >
          {orderMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="shopping-bag" size={18} color={!selectedSize || !canAfford ? colors.mutedForeground : colors.primaryForeground} />
              <Text style={[styles.orderBtnText, { color: !selectedSize || !canAfford ? colors.mutedForeground : colors.primaryForeground }]}>
                {!selectedSize ? "Select a size to proceed" : canAfford ? `Order · ${formatNaira(totalWithDelivery)}` : "Insufficient Balance"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", elevation: 2 },
  content: { paddingBottom: 20 },
  imageWrap: { height: 280, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  details: { padding: 20, gap: 16 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  animalName: { fontSize: 22, fontWeight: "700" },
  category: { fontSize: 13, marginTop: 2 },
  eidBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  eidBadgeText: { fontSize: 12, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sizeCard: { flex: 1, minWidth: "44%", padding: 14, borderWidth: 1.5, gap: 4 },
  sizeLabel: { fontSize: 14, fontWeight: "600" },
  sizeWeight: { fontSize: 12 },
  sizePrice: { fontSize: 15, fontWeight: "700" },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  qtyBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  qtyValue: { fontSize: 22, fontWeight: "700", minWidth: 40, textAlign: "center" },
  summaryCard: { borderWidth: 1, padding: 16, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14 },
  summaryVal: { fontSize: 14 },
  summaryDivider: { height: StyleSheet.hairlineWidth },
  warningRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8 },
  warningText: { fontSize: 12, flex: 1 },
  error: { fontSize: 13 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  orderBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  orderBtnText: { fontSize: 16, fontWeight: "600" },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontWeight: "700" },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: { marginTop: 8, paddingHorizontal: 48, height: 52, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 16, fontWeight: "600" },
});