import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useCreateGroup, useGetAnimals } from "@workspace/api-client-react";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const MEMBER_LIMITS = [2, 4, 7];

export default function CreateGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberLimit, setMemberLimit] = useState(7);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");

  const createMutation = useCreateGroup();
  const { data: animalsData } = useGetAnimals({ eidType: "fitr", category: "Cow" });

  const cows = animalsData?.animals ?? [];

  const handleCreate = async () => {
    setError("");
    if (!name.trim()) { setError("Group name is required"); return; }

    try {
      const group = await createMutation.mutateAsync({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          memberLimit,
          animalId: selectedAnimalId,
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/groups/${group.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create group";
      setError(msg);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      bottomOffset={20}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Create Group</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Group Name</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        placeholder="e.g. Ibrahim Family Eid Cow"
        placeholderTextColor={colors.mutedForeground}
        value={name}
        onChangeText={setName}
      />

      <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>Description (Optional)</Text>
      <TextInput
        style={[styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        placeholder="Notes for family/friends sharing this cow..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={3}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>Maximum Members</Text>
      <View style={styles.limitsRow}>
        {MEMBER_LIMITS.map((limit) => (
          <Pressable
            key={limit}
            style={[
              styles.limitPill,
              {
                backgroundColor: memberLimit === limit ? colors.primary : colors.card,
                borderColor: memberLimit === limit ? colors.primary : colors.border,
                borderRadius: colors.radius,
              },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMemberLimit(limit); }}
          >
            <Text style={[styles.limitText, { color: memberLimit === limit ? colors.primaryForeground : colors.foreground }]}>
              {limit} Members
            </Text>
          </Pressable>
        ))}
      </View>

      {cows.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 20 }]}>Select Target Cow</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.animalsScroll}>
            {cows.map((c) => (
              <Pressable
                key={c.id}
                style={[
                  styles.animalOption,
                  {
                    backgroundColor: selectedAnimalId === c.id ? colors.primary + "15" : colors.card,
                    borderColor: selectedAnimalId === c.id ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                onPress={() => setSelectedAnimalId(selectedAnimalId === c.id ? undefined : c.id)}
              >
                <Text style={[styles.animalName, { color: colors.foreground }]}>{c.name}</Text>
                <Text style={[styles.animalPrice, { color: colors.primary }]}>
                  ₦{(c.sizes?.[0]?.price ?? 0).toLocaleString("en-NG")}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <Pressable
        style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: createMutation.isPending ? 0.7 : 1 }]}
        onPress={handleCreate}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Create Contribution Group</Text>
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  sectionLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  textarea: { height: 90, borderWidth: 1, padding: 14, fontSize: 15, textAlignVertical: "top" },
  limitsRow: { flexDirection: "row", gap: 10 },
  limitPill: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  limitText: { fontSize: 13, fontWeight: "600" },
  animalsScroll: { flexDirection: "row", marginBottom: 16 },
  animalOption: { width: 140, padding: 12, borderWidth: 1.5, marginRight: 10, gap: 4 },
  animalName: { fontSize: 13, fontWeight: "600" },
  animalPrice: { fontSize: 13, fontWeight: "700" },
  error: { fontSize: 13, marginTop: 12 },
  submitBtn: { height: 56, alignItems: "center", justifyContent: "center", marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: "600" },
});