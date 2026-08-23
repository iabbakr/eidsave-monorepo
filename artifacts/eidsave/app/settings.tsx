import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { settings, updateSetting } = useNotificationStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTIFICATIONS</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {[
            { key: "depositNotifs" as const, label: "Deposit confirmations", value: settings.depositNotifs, icon: "credit-card" as const },
            { key: "eidReminders" as const, label: "Eid reminders", value: settings.eidReminders, icon: "bell" as const },
            { key: "deliveryUpdates" as const, label: "Delivery updates", value: settings.deliveryUpdates, icon: "truck" as const },
            { key: "marketingNotifs" as const, label: "Promotions & news", value: settings.marketingNotifs, icon: "mail" as const },
          ].map((item, idx, arr) => (
            <View
              key={item.key}
              style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: idx < arr.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
                <Feather name={item.icon} size={16} color={colors.foreground} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Switch
                value={item.value}
                onValueChange={(val) => updateSetting(item.key, val)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>SECURITY</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Pressable style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Change PIN</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>ABOUT</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Version</Text>
            <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>1.0.0</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
              <Feather name="shield" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Privacy Policy</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 8 },
  section: { borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 14 },
});