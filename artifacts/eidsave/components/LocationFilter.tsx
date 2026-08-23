import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, FlatList, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/hooks/useLocations";

export interface LocationValue {
  state: string;
  city: string;
  area: string;
}

interface LocationFilterProps {
  value: Partial<LocationValue>;
  onChange: (value: LocationValue) => void;
  label?: string;
}

type Step = "state" | "city" | "area" | null;

export function LocationFilter({ value, onChange, label = "Location" }: LocationFilterProps) {
  const colors = useColors();
  const { getStates, getCities, getAreas } = useLocations();

  const [step, setStep] = useState<Step>(null);
  const [tempState, setTempState] = useState(value.state ?? "");
  const [tempCity, setTempCity] = useState(value.city ?? "");

  const states = getStates();
  const cities = getCities(tempState);
  const areas = getAreas(tempState, tempCity);

  const openSelector = () => {
    setTempState(value.state ?? "");
    setTempCity(value.city ?? "");
    setStep("state");
  };

  const displayText =
    value.area && value.city && value.state
      ? `${value.area}, ${value.city}, ${value.state}`
      : value.state
      ? value.state
      : `Select ${label.toLowerCase()}`;

  const hasValue = !!(value.state && value.city && value.area);

  const renderItem = (text: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={text}
      style={[
        styles.item,
        {
          backgroundColor: selected ? colors.primary + "15" : "transparent",
          borderColor: selected ? colors.primary : "transparent",
          borderBottomColor: colors.border,
          borderBottomWidth: selected ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.itemText, { color: selected ? colors.primary : colors.foreground }]}>{text}</Text>
      {selected && <Feather name="check" size={16} color={colors.primary} />}
    </Pressable>
  );

  return (
    <View>
      <Pressable
        style={[
          styles.trigger,
          {
            borderColor: hasValue ? colors.primary : colors.border,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
          },
        ]}
        onPress={openSelector}
      >
        <Feather name="map-pin" size={16} color={hasValue ? colors.primary : colors.mutedForeground} />
        <Text
          numberOfLines={1}
          style={[styles.triggerText, { color: hasValue ? colors.foreground : colors.mutedForeground }]}
        >
          {displayText}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={step !== null} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            {step !== "state" ? (
              <Pressable
                onPress={() => setStep(step === "area" ? "city" : "state")}
                style={styles.headerBtn}
              >
                <Feather name="chevron-left" size={22} color={colors.foreground} />
              </Pressable>
            ) : (
              <View style={{ width: 36 }} />
            )}
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {step === "state" ? "Select State" : step === "city" ? "Select City" : "Select Area"}
            </Text>
            <Pressable onPress={() => setStep(null)} style={styles.headerBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          {step === "state" && (
            <FlatList
              data={states}
              keyExtractor={(s) => s}
              renderItem={({ item }) =>
                renderItem(item, item === tempState, () => {
                  setTempState(item);
                  setTempCity("");
                  setStep("city");
                })
              }
            />
          )}

          {step === "city" && (
            <FlatList
              data={cities}
              keyExtractor={(c) => c}
              renderItem={({ item }) =>
                renderItem(item, item === tempCity, () => {
                  setTempCity(item);
                  setStep("area");
                })
              }
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                  No cities found for {tempState}
                </Text>
              }
            />
          )}

          {step === "area" && (
            <FlatList
              data={areas}
              keyExtractor={(a) => a}
              renderItem={({ item }) =>
                renderItem(item, item === value.area, () => {
                  onChange({ state: tempState, city: tempCity, area: item });
                  setStep(null);
                })
              }
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                  No areas found for {tempCity}
                </Text>
              }
            />
          )}

          <View style={{ height: Platform.OS === "android" ? 24 : 0 }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  triggerText: { flex: 1, fontSize: 15 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 16 : 32,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemText: { fontSize: 16 },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
