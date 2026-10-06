import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <AdminHeader title="Admin Tools" backTo="/admin" />
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.foreground }]}>
          Maintenance & Operations Tools
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  content: { marginTop: 24 },
  text: { fontSize: 16 },
});