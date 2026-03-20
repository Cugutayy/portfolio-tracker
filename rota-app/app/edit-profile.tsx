import { useState, useEffect } from "react";
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
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API, type Member } from "@/lib/api";

const PACE_GROUPS = ["5:00-5:30", "5:30-6:00", "6:00-6:30", "6:30-7:00", "7:00+"];

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [paceGroup, setPaceGroup] = useState<string | null>(null);
  const [instagram, setInstagram] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await API.getProfile();
      const m = (profile as { member?: Member }).member || (profile as Member);
      setName(m.name || "");
      setBio(m.bio || "");
      setPaceGroup(m.paceGroup || null);
      setInstagram(m.instagram || "");
      if (m.image) setImageUri(m.image);
    } catch {
      Alert.alert("Hata", "Profil yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      if (asset.base64) {
        // Check size (~1MB limit for base64)
        if (asset.base64.length > 1_400_000) {
          Alert.alert("Hata", "Fotograf cok buyuk. Daha kucuk bir fotograf secin.");
          return;
        }
        setImageBase64(asset.base64);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Hata", "Isim alani bos birakilamaz.");
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        name: name.trim(),
        bio: bio.trim() || null,
        paceGroup,
        instagram: instagram.trim() || null,
      };
      if (imageBase64) {
        updateData.image = `data:image/jpeg;base64,${imageBase64}`;
      }
      await API.updateProfile(updateData as Partial<Member>);
      router.back();
    } catch {
      Alert.alert("Hata", "Profil guncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator color={brand.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={brand.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>PROFIL DUZENLE</Text>
          <TouchableOpacity
            style={[s.saveButton, saving && s.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={[s.saveButtonText, saving && s.saveButtonTextDisabled]}>
              {saving ? "..." : "KAYDET"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <TouchableOpacity style={s.avatarSection} onPress={pickImage} activeOpacity={0.7}>
            <View style={s.avatar}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{initials}</Text>
              )}
              <View style={s.cameraIcon}>
                <Ionicons name="camera" size={14} color={brand.bg} />
              </View>
            </View>
            <Text style={s.avatarHint}>FOTOGRAF DEGISTIR</Text>
          </TouchableOpacity>

          {/* Name */}
          <View style={s.field}>
            <Text style={s.label}>ISIM</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Adiniz"
              placeholderTextColor={brand.textDim}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Bio */}
          <View style={s.field}>
            <Text style={s.label}>BIO</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Kendinizden bahsedin..."
              placeholderTextColor={brand.textDim}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={s.charCount}>{bio.length}/200</Text>
          </View>

          {/* Pace Group */}
          <View style={s.field}>
            <Text style={s.label}>TEMPO GRUBU</Text>
            <View style={s.chipsRow}>
              {PACE_GROUPS.map((pg) => {
                const selected = paceGroup === pg;
                return (
                  <TouchableOpacity
                    key={pg}
                    style={[s.chip, selected && s.chipSelected]}
                    onPress={() => setPaceGroup(selected ? null : pg)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipText, selected && s.chipTextSelected]}>
                      {pg}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Instagram */}
          <View style={s.field}>
            <Text style={s.label}>INSTAGRAM</Text>
            <View style={s.inputWithPrefix}>
              <Text style={s.prefix}>@</Text>
              <TextInput
                style={s.inputPrefixed}
                value={instagram}
                onChangeText={(t) => setInstagram(t.replace(/^@/, ""))}
                placeholder="kullanici_adi"
                placeholderTextColor={brand.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: brand.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: brand.text,
    letterSpacing: 3,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: brand.accent,
    borderRadius: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: brand.bg,
    letterSpacing: 2,
  },
  saveButtonTextDisabled: {
    color: brand.bg,
  },

  content: { padding: 24 },

  // Avatar
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: brand.surface,
    borderWidth: 2,
    borderColor: brand.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  avatarText: { fontSize: 28, fontWeight: "bold", color: brand.accent },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: brand.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: brand.bg,
  },
  avatarHint: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.textDim,
    letterSpacing: 2,
  },

  // Fields
  field: { marginBottom: 24 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.textMuted,
    letterSpacing: 3,
    marginBottom: 8,
  },
  input: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: brand.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: brand.textDim,
    textAlign: "right",
    marginTop: 6,
  },

  // Chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  chipSelected: {
    borderColor: brand.accent,
    backgroundColor: brand.accent + "18",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.textMuted,
  },
  chipTextSelected: {
    color: brand.accent,
  },

  // Instagram input
  inputWithPrefix: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
  },
  prefix: {
    fontSize: 15,
    color: brand.textDim,
    paddingLeft: 14,
    paddingRight: 2,
  },
  inputPrefixed: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 12,
    paddingRight: 14,
    fontSize: 15,
    color: brand.text,
  },
});
