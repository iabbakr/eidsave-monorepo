import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Modal, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useGetUserProfile, useUpdateUserProfile } from "@workspace/api-client-react";
import { useLocations } from "@/hooks/useLocations";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setUser } = useAuth();
  const { data: profile, isLoading } = useGetUserProfile();
  const updateMutation = useUpdateUserProfile();
  const { getStates, getCities } = useLocations();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [street, setStreet] = useState("");
  const [nkName, setNkName] = useState("");
  const [nkPhone, setNkPhone] = useState("");
  const [nkRel, setNkRel] = useState("");

  const [showStateModal, setShowStateModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setState(profile.address?.state ?? "");
      setCity(profile.address?.city ?? "");
      setTown(profile.address?.town ?? "");
      setStreet(profile.address?.street ?? "");
      setNkName(profile.nextOfKin?.name ?? "");
      setNkPhone(profile.nextOfKin?.phone ?? "");
      setNkRel(profile.nextOfKin?.relationship ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    setError("");
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required"); return; }
    if (!state || !city || !street) { setError("Complete delivery address is required"); return; }

    try {
      const updated = await updateMutation.mutateAsync({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          address: { state, city, town: town || undefined, street: street.trim() },
          nextOfKin: nkName ? { name: nkName.trim(), phone: nkPhone.trim(), relationship: nkRel.trim() } : undefined,
        },
      });

      setUser(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update profile";
      setError(msg);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

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
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Information</Text>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>Primary Delivery Address</Text>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>State</Text>
        <Pressable
          style={[styles.input, styles.selector, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
          onPress={() => setShowStateModal(true)}
        >
          <Text style={{ color: state ? colors.foreground : colors.mutedForeground }}>{state || "Select State"}</Text>
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>City / LGA</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          value={city}
          onChangeText={setCity}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Street Address</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          value={street}
          onChangeText={setStreet}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>Next of Kin</Text>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Contact Name</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          value={nkName}
          onChangeText={setNkName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Contact Phone</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          keyboardType="phone-pad"
          value={nkPhone}
          onChangeText={setNkPhone}
        />
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <Pressable
        style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: updateMutation.isPending ? 0.7 : 1 }]}
        onPress={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Save Changes</Text>
        )}
      </Pressable>

      <Modal visible={showStateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select State</Text>
            <Pressable onPress={() => setShowStateModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <FlatList
            data={getStates()}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.stateItem, { borderBottomColor: colors.border }]}
                onPress={() => { setState(item); setShowStateModal(false); }}
              >
                <Text style={[styles.stateItemText, { color: item === state ? colors.primary : colors.foreground }]}>
                  {item}
                </Text>
                {item === state && <Feather name="check" size={16} color={colors.primary} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  inputGroup: { gap: 6, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "500" },
  input: { height: 50, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  selector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  error: { fontSize: 13, marginTop: 4 },
  submitBtn: { height: 56, alignItems: "center", justifyContent: "center", marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: "600" },
  modal: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  stateItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  stateItemText: { fontSize: 16 },
});