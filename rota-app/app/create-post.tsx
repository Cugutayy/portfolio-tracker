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
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

const MAX_PHOTOS = 3;
const MAX_CHARS = 1000;

interface PhotoAsset {
  uri: string;
  base64: string;
}

export default function CreatePostScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [posting, setPosting] = useState(false);

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Limit", `En fazla ${MAX_PHOTOS} fotograf ekleyebilirsin.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!asset.base64) return;
      setPhotos((prev) => [...prev, { uri: asset.uri, base64: asset.base64! }]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const canPost = text.trim().length > 0 || photos.length > 0;

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const data: Record<string, string> = {};
      if (text.trim()) data.text = text.trim();
      if (photos[0]) data.photoBase64 = `data:image/jpeg;base64,${photos[0].base64}`;
      if (photos[1]) data.photoBase64_2 = `data:image/jpeg;base64,${photos[1].base64}`;
      if (photos[2]) data.photoBase64_3 = `data:image/jpeg;base64,${photos[2].base64}`;
      if (groupId) data.groupId = groupId;
      await API.createPost(data);
      router.back();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as Error).message : "Bilinmeyen hata";
      Alert.alert("Hata", `Gonderi paylasilamadi: ${msg}`);
    } finally {
      setPosting(false);
    }
  };

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
          <Text style={s.headerTitle}>GONDERI OLUSTUR</Text>
          <TouchableOpacity
            style={[s.postButton, (!canPost || posting) && s.postButtonDisabled]}
            onPress={handlePost}
            disabled={!canPost || posting}
          >
            {posting ? (
              <ActivityIndicator color={brand.bg} size="small" />
            ) : (
              <Text style={[s.postButtonText, !canPost && s.postButtonTextDisabled]}>
                PAYLAS
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Text input */}
          <TextInput
            style={s.textInput}
            value={text}
            onChangeText={(t) => t.length <= MAX_CHARS && setText(t)}
            placeholder="Ne dusunuyorsun?"
            placeholderTextColor={brand.textDim}
            multiline
            textAlignVertical="top"
            autoFocus
          />

          {/* Character counter */}
          <Text style={[s.charCount, text.length > MAX_CHARS * 0.9 && s.charCountWarn]}>
            {text.length}/{MAX_CHARS}
          </Text>

          {/* Photo previews */}
          {photos.length > 0 && (
            <View style={s.photosRow}>
              {photos.map((photo, i) => (
                <View key={i} style={s.photoThumb}>
                  <Image source={{ uri: photo.uri }} style={s.photoImage} />
                  <TouchableOpacity
                    style={s.photoRemove}
                    onPress={() => removePhoto(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={14} color={brand.bg} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Photo picker button */}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={s.addPhotoButton} onPress={pickPhoto} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={20} color={brand.accent} />
              <Text style={s.addPhotoText}>
                Fotograf Ekle ({photos.length}/{MAX_PHOTOS})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: brand.bg },

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
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: brand.accent,
    borderRadius: 4,
    minWidth: 72,
    alignItems: "center",
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: brand.bg,
    letterSpacing: 2,
  },
  postButtonTextDisabled: {
    color: brand.bg,
  },

  content: { padding: 20 },

  // Text input
  textInput: {
    fontSize: 16,
    color: brand.text,
    minHeight: 120,
    lineHeight: 22,
  },

  charCount: {
    fontSize: 11,
    color: brand.textDim,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 16,
  },
  charCountWarn: {
    color: "#FF6B6B",
  },

  // Photos
  photosRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 6,
    overflow: "hidden",
  },
  photoImage: {
    width: 90,
    height: 90,
  },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    borderStyle: "dashed",
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.accent,
  },
});
