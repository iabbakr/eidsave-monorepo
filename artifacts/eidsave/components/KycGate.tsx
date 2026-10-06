import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export function KycGate({ body }: { body: string }) {
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.icon, { backgroundColor: colors.primary + "15" }]}>
        <Feather name="shield" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Verify your identity</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{body}</Text>
      <Pressable
        style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
        onPress={() => router.push("../kyc")}
      >
        <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Verify with BVN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 20, alignItems: "center", gap: 10 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  btn: { height: 48, alignSelf: "stretch", alignItems: "center", justifyContent: "center", marginTop: 6 },
  btnText: { fontSize: 15, fontWeight: "600" },
});