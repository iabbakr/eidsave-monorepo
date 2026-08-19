import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, ScrollView, Switch, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  useGetAnimal,
  useCreateAnimal,
  useUpdateAnimal,
  useUploadImage,
  CreateAnimalRequestCategory,
  CreateAnimalRequestStock,
  CreateAnimalRequestEidType,
  AnimalSizeLabel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const CATEGORIES = Object.values(CreateAnimalRequestCategory);
const STOCK_OPTIONS = Object.values(CreateAnimalRequestStock);
const EID_TYPES = Object.values(CreateAnimalRequestEidType);
const SIZE_LABELS = Object.values(AnimalSizeLabel);

type SizeRow = { label: string; weight: string; price: string };

export default function AdminAnimalFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const { data: existing, isLoading } = useGetAnimal(id!, { query: { enabled: isEdit } });
  const createMutation = useCreateAnimal();
  const updateMutation = useUpdateAnimal();
  const uploadMutation = useUploadImage();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [stock, setStock] = useState<string>(STOCK_OPTIONS[0]);
  const [eidType, setEidType] = useState<string>(EID_TYPES[0]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [sizes, setSizes] = useState<SizeRow[]>([
    { label: "Small", weight: "15-20kg", price: "" },
    { label: "Medium", weight: "25-30kg", price: "" },
  ]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setCategory(existing.category);
    setDescription(existing.description);
    setImageUrl(existing.imageUrl);
    setStock(existing.stock);
    setEidType(existing.eidType);
    setIsAvailable(existing.isAvailable);
    setSizes(
      existing.sizes.map((s) => ({
        label: s.label,
        weight: s.weight,
        price: String(s.price),
      })),
    );
  }, [existing]);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;

    setUploading(true);
    try {
      const asset = res.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName ?? "animal.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob;
      const result = await uploadMutation.mutateAsync({ data: { file } });
      setImageUrl(result.url);
    } catch {
      Alert.alert("Upload failed", "Could not upload image. You can paste a URL instead.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    if (!description.trim()) { setError("Description is required"); return; }
    if (!imageUrl.trim()) { setError("Image is required"); return; }

    const parsedSizes = sizes
      .filter((s) => s.price.trim())
      .map((s) => ({
        label: s.label as (typeof AnimalSizeLabel)[keyof typeof AnimalSizeLabel],
        weight: s.weight,
        price: parseFloat(s.price),
      }));

    if (parsedSizes.length === 0) {
      setError("Add at least one size with a price");
      return;
    }

    const payload = {
      name: name.trim(),
      category: category as (typeof CreateAnimalRequestCategory)[keyof typeof CreateAnimalRequestCategory],
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      sizes: parsedSizes,
      isAvailable,
      stock: stock as (typeof CreateAnimalRequestStock)[keyof typeof CreateAnimalRequestStock],
      eidType: eidType as (typeof CreateAnimalRequestEidType)[keyof typeof CreateAnimalRequestEidType],
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload });
      } else {
        await createMutation.mutateAsync({ data: payload });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/v1/animals"] });
      router.back();
    } catch {
      setError("Failed to save animal listing");
    }
  };

  if (isEdit && isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
    >
      <AdminHeader title={isEdit ? "Edit Animal" : "New Animal"} backTo="/admin/animals" />

      <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Premium Ram"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[styles.chip, { backgroundColor: category === c ? colors.primary : colors.muted, borderRadius: colors.radius }]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.chipText, { color: category === c ? colors.primaryForeground : colors.foreground }]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
      <TextInput
        style={[styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        placeholder="Describe the animal..."
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={[styles.label, { color: colors.foreground }]}>Image</Text>
      <View style={styles.imageRow}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={[styles.preview, { borderColor: colors.border }]} />
        ) : null}
        <Pressable
          style={[styles.uploadBtn, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
          onPress={pickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Feather name="camera" size={18} color={colors.mutedForeground} />
              <Text style={[styles.uploadText, { color: colors.mutedForeground }]}>Upload</Text>
            </>
          )}
        </Pressable>
      </View>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="Or paste image URL"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
      />

      <Text style={[styles.label, { color: colors.foreground }]}>Eid Type</Text>
      <View style={styles.chipRowWrap}>
        {EID_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, { backgroundColor: eidType === t ? colors.primary : colors.muted, borderRadius: colors.radius }]}
            onPress={() => setEidType(t)}
          >
            <Text style={[styles.chipText, { color: eidType === t ? colors.primaryForeground : colors.foreground }]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>Stock Status</Text>
      <View style={styles.chipRowWrap}>
        {STOCK_OPTIONS.map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, { backgroundColor: stock === s ? colors.primary : colors.muted, borderRadius: colors.radius }]}
            onPress={() => setStock(s)}
          >
            <Text style={[styles.chipText, { color: stock === s ? colors.primaryForeground : colors.foreground }]}>{s.replace("_", " ")}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.foreground, marginBottom: 0 }]}>Available for purchase</Text>
        <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor="#fff" />
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>Sizes & Prices</Text>
      {sizes.map((size, idx) => (
        <View key={idx} style={[styles.sizeRow, { borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sizeLabel, { color: colors.foreground }]}>{size.label}</Text>
          <TextInput
            style={[styles.sizeInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            value={size.weight}
            onChangeText={(v) => {
              const next = [...sizes];
              next[idx] = { ...next[idx], weight: v };
              setSizes(next);
            }}
            placeholder="Weight"
            placeholderTextColor={colors.mutedForeground}
          />
          <TextInput
            style={[styles.sizeInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            value={size.price}
            onChangeText={(v) => {
              const next = [...sizes];
              next[idx] = { ...next[idx], price: v };
              setSizes(next);
            }}
            placeholder="Price ₦"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
          />
        </View>
      ))}
      <Pressable
        style={[styles.addSizeBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
        onPress={() => {
          const unused = SIZE_LABELS.find((l) => !sizes.some((s) => s.label === l));
          if (unused) setSizes([...sizes, { label: unused, weight: "", price: "" }]);
        }}
      >
        <Feather name="plus" size={16} color={colors.primary} />
        <Text style={[styles.addSizeText, { color: colors.primary }]}>Add size</Text>
      </Pressable>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <Pressable
        style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: saving ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{isEdit ? "Save Changes" : "Create Listing"}</Text>
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, paddingHorizontal: 14, height: 44, fontSize: 14 },
  textarea: { borderWidth: 1, padding: 14, fontSize: 14, minHeight: 100 },
  chipRow: { marginBottom: 4 },
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  imageRow: { flexDirection: "row", gap: 12, marginBottom: 8, alignItems: "center" },
  preview: { width: 72, height: 72, borderRadius: 8, borderWidth: 1 },
  uploadBtn: { width: 90, height: 72, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  uploadText: { fontSize: 11 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, padding: 10, marginBottom: 8 },
  sizeLabel: { width: 56, fontSize: 12, fontWeight: "600" },
  sizeInput: { flex: 1, borderWidth: 1, paddingHorizontal: 10, height: 36, fontSize: 13 },
  addSizeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, justifyContent: "center", borderWidth: 1, marginBottom: 12 },
  addSizeText: { fontSize: 13, fontWeight: "600" },
  error: { fontSize: 13, marginBottom: 8 },
  saveBtn: { height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
});
