import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export function AdminHeader({ title, backTo }: { title: string; backTo?: string }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={styles.headerRow}>
      <Pressable
        onPress={() => (backTo ? router.push(backTo as never) : router.back())}
        style={styles.backBtn}
      >
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
});
