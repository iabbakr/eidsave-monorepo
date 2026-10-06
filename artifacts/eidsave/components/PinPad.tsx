import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;

export function PinPad({
  pin,
  onChange,
  colors,
  length = 4,
}: {
  pin: string;
  onChange: (p: string) => void;
  colors: Colors;
  length?: number;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  const tap = (k: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (k === "⌫") { onChange(pin.slice(0, -1)); return; }
    if (k === "") return;
    if (pin.length < length) onChange(pin + k);
  };

  return (
    <View>
      <View style={styles.pinDotsRow}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              { backgroundColor: i < pin.length ? colors.primary : colors.muted, borderColor: colors.border },
            ]}
          />
        ))}
      </View>
      <View style={styles.pinGrid}>
        {keys.map((k, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.pinKey,
              { backgroundColor: pressed ? colors.muted : "transparent", borderRadius: colors.radius },
            ]}
            onPress={() => tap(k)}
          >
            <Text style={[styles.pinKeyText, { color: k === "⌫" ? colors.destructive : colors.foreground }]}>
              {k}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinDotsRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 40 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pinGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  pinKey: { width: "33.33%", height: 72, alignItems: "center", justifyContent: "center" },
  pinKeyText: { fontSize: 24, fontWeight: "400" },
});