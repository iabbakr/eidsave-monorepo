import { useRef, useCallback } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}

export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const colors = useColors();
  const refs = useRef<(TextInput | null)[]>([]);
  const digits = Array(length).fill("").map((_, i) => value[i] || "");

  const handleKey = useCallback(
    (index: number, key: string, text: string) => {
      if (key === "Backspace") {
        if (!value[index] && index > 0) {
          refs.current[index - 1]?.focus();
          onChange(value.slice(0, index - 1) + value.slice(index));
        } else {
          onChange(value.slice(0, index) + value.slice(index + 1));
        }
        return;
      }
      const digit = text.replace(/\D/g, "").slice(-1);
      if (!digit) return;
      const next = value.slice(0, index) + digit + value.slice(index + 1);
      onChange(next);
      if (index < length - 1) refs.current[index + 1]?.focus();
    },
    [value, onChange, length],
  );

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          style={[
            styles.box,
            {
              borderColor: d ? colors.primary : colors.border,
              backgroundColor: d ? colors.primary + "10" : colors.card,
              color: colors.foreground,
            },
          ]}
          value={d}
          onChangeText={(t) => handleKey(i, "", t)}
          onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key, "")}
          keyboardType="numeric"
          maxLength={1}
          textAlign="center"
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
  box: {
    width: 44,
    height: 54,
    borderWidth: 1.5,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: "700",
  },
});
