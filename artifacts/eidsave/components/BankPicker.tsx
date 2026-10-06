import { useMemo, useState } from "react";
import { Modal, View, Text, TextInput, FlatList, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Bank } from "@/hooks/useAccountActions";

export function BankPicker({ visible, banks, onSelect, onClose }: {
  visible: boolean;
  banks: Bank[];
  onSelect: (bank: Bank) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const data = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? banks.filter((b) => b.name.toLowerCase().includes(needle)) : banks;
  }, [banks, q]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Select bank</Text>
          <Pressable onPress={onClose} style={styles.close}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <TextInput
          style={[styles.search, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          placeholder="Search banks"
          placeholderTextColor={colors.mutedForeground}
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
        />
        <FlatList
          data={data}
          keyExtractor={(b) => b.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => { setQ(""); onSelect(item); }}
            >
              <Text style={[styles.rowText, { color: colors.foreground }]}>{item.name}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  close: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  search: { height: 48, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, marginBottom: 8 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { fontSize: 15 },
});