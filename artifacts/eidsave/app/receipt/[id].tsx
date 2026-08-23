import { View, Text, StyleSheet, Pressable, ScrollView, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

export default function ReceiptScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    reference: string;
    type: string;
    amount: string;
    walletType: string;
    date: string;
    status: string;
  }>();

  const numAmount = parseFloat(params.amount || "0");

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `EidSave Official Receipt\nRef: ${params.reference}\nType: ${params.type?.toUpperCase()}\nAmount: ${formatNaira(numAmount)}\nDate: ${params.date}\nStatus: Successful`,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Transaction Receipt</Text>
        <Pressable onPress={handleShare} style={styles.backBtn}>
          <Feather name="share-2" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={[styles.successIconWrap, { backgroundColor: colors.success + "20" }]}>
            <Feather name="check" size={32} color={colors.success} />
          </View>
          <Text style={[styles.receiptAmount, { color: colors.foreground }]}>{formatNaira(numAmount)}</Text>
          <Text style={[styles.receiptSubtitle, { color: colors.mutedForeground }]}>Transaction Confirmed</Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Reference</Text>
              <Text style={[styles.metaVal, { color: colors.foreground }]}>{params.reference || params.id}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Transaction Type</Text>
              <Text style={[styles.metaVal, { color: colors.foreground }]}>{params.type?.toUpperCase()}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Wallet</Text>
              <Text style={[styles.metaVal, { color: colors.foreground }]}>
                {params.walletType === "adha" ? "Eid al-Adha" : "Eid al-Fitr"}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Date</Text>
              <Text style={[styles.metaVal, { color: colors.foreground }]}>{params.date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Status</Text>
              <Text style={[styles.metaVal, { color: colors.success }]}>COMPLETED</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Back to App</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  content: { padding: 24, gap: 20 },
  receiptCard: { borderWidth: 1, padding: 24, alignItems: "center" },
  successIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  receiptAmount: { fontSize: 28, fontWeight: "700" },
  receiptSubtitle: { fontSize: 14, marginTop: 4 },
  divider: { width: "100%", height: 1, marginVertical: 20 },
  metaList: { width: "100%", gap: 14 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaKey: { fontSize: 13 },
  metaVal: { fontSize: 13, fontWeight: "600" },
  doneBtn: { height: 56, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 16, fontWeight: "600" },
});