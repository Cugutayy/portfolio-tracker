import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

const SPORT_TYPES = [
  { value: "running", label: "Kosu" },
  { value: "cycling", label: "Bisiklet" },
  { value: "swimming", label: "Yuzme" },
  { value: "walking", label: "Yuruyus" },
  { value: "other", label: "Diger" },
];

export default function CreateGroupScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [sportType, setSportType] = useState("running");
  const [city, setCity] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setImage(`data:image/jpeg;base64,${asset.base64}`);
        setImageUri(asset.uri);
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Hata", "Grup adi gerekli");
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, string> = { name: name.trim() };
      if (description.trim()) data.description = description.trim();
      if (image) data.image = image;
      data.sportType = sportType;
      if (city.trim()) data.city = city.trim();
      data.visibility = visibility;

      const res = await API.createGroup(data as any);
      router.replace(`/group/${res.group.slug}` as never);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Grup olusturulamadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={brand.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>GRUP OLUSTUR</Text>
        <TouchableOpacity
          style={[s.createBtn, (saving || !name.trim()) && s.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving || !name.trim()}
        >
          {saving ? (
            <ActivityIndicator color={brand.bg} size="small" />
          ) : (
            <Text style={s.createBtnText}>OLUSTUR</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={s.form} contentContainerStyle={s.formContent}>
        {/* Image picker */}
        <TouchableOpacity style={s.imagePicker} onPress={pickImage} activeOpacity={0.7}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.imagePreview} />
          ) : (
            <View style={s.imagePlaceholder}>
              <Ionicons name="camera-outline" size={32} color={brand.textDim} />
              <Text style={s.imagePickerText}>Fotograf Sec</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={s.field}>
          <Text style={s.label}>GRUP ADI *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="orn: Alsancak Kosuculari"
            placeholderTextColor={brand.textDim}
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>ACIKLAMA</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={description}
            onChangeText={(t) => t.length <= 500 && setDescription(t)}
            placeholder="Grup hakkinda kisa bir aciklama..."
            placeholderTextColor={brand.textDim}
            multiline
            numberOfLines={3}
          />
          <Text style={s.charCount}>{description.length}/500</Text>
        </View>

        <View style={s.field}>
          <Text style={s.label}>SPOR TURU</Text>
          <View style={s.chipsRow}>
            {SPORT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[s.chip, sportType === t.value && s.chipSelected]}
                onPress={() => setSportType(t.value)}
              >
                <Text style={[s.chipText, sportType === t.value && s.chipTextSelected]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>SEHIR</Text>
          <View style={s.chipsRow}>
            {["Izmir", "Istanbul", "Ankara", "Antalya", "Bursa"].map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.chip, city === c && s.chipSelected]}
                onPress={() => setCity(city === c ? "" : c)}
              >
                <Text style={[s.chipText, city === c && s.chipTextSelected]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>GORUNURLUK</Text>
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, visibility === "public" && s.toggleBtnActive]}
              onPress={() => setVisibility("public")}
            >
              <Ionicons name="earth-outline" size={16} color={visibility === "public" ? brand.bg : brand.textMuted} />
              <Text style={[s.toggleText, visibility === "public" && s.toggleTextActive]}>Acik</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, visibility === "private" && s.toggleBtnActive]}
              onPress={() => setVisibility("private")}
            >
              <Ionicons name="lock-closed-outline" size={16} color={visibility === "private" ? brand.bg : brand.textMuted} />
              <Text style={[s.toggleText, visibility === "private" && s.toggleTextActive]}>Kapali</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 14, fontWeight: "bold", color: brand.text, letterSpacing: 3 },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: brand.accent,
    borderRadius: 4,
    minWidth: 80,
    alignItems: "center",
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { fontSize: 11, fontWeight: "700", color: brand.bg, letterSpacing: 2 },
  form: { flex: 1 },
  formContent: { padding: 16, gap: 16 },
  imagePicker: { alignSelf: "center", marginBottom: 8 },
  imagePreview: { width: 100, height: 100, borderRadius: 50 },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickerText: { fontSize: 10, color: brand.textDim, marginTop: 4 },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: "700", color: brand.textMuted, letterSpacing: 2 },
  input: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: brand.text,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  charCount: { fontSize: 11, color: brand.textDim, textAlign: "right" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  chipSelected: { borderColor: brand.accent, backgroundColor: brand.accent + "18" },
  chipText: { fontSize: 12, fontWeight: "600", color: brand.textMuted },
  chipTextSelected: { color: brand.accent },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  toggleBtnActive: { backgroundColor: brand.accent, borderColor: brand.accent },
  toggleText: { fontSize: 13, fontWeight: "600", color: brand.textMuted },
  toggleTextActive: { color: brand.bg },
});
