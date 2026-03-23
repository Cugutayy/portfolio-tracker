import { useState, useEffect, useCallback } from "react";
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
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { brand } from "@/constants/Colors";
import { API, type Group } from "@/lib/api";

export default function GroupSettingsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchGroup = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await API.getGroup(slug);
      setGroup(res.group);
      setName(res.group.name);
      setDescription(res.group.description || "");
    } catch {}
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleGenerateInvite = async () => {
    if (!slug) return;
    setGeneratingInvite(true);
    try {
      const res = await API.createGroupInvite(slug);
      setInviteCode(res.code);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Davet kodu olusturulamadi");
    }
    setGeneratingInvite(false);
  };

  const handleShareInvite = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `${group?.name || "Grup"} grubuna katil! Davet kodu: ${inviteCode}`,
      });
    } catch {}
  };

  const handleLeave = () => {
    Alert.alert(
      "Gruptan Ayril",
      "Bu gruptan ayrilmak istediginize emin misiniz?",
      [
        { text: "Iptal", style: "cancel" },
        {
          text: "Ayril",
          style: "destructive",
          onPress: async () => {
            if (!slug) return;
            try {
              await API.leaveGroup(slug);
              router.replace("/(tabs)/groups" as never);
            } catch (err) {
              Alert.alert("Hata", err instanceof Error ? err.message : "Ayrilma basarisiz");
            }
          },
        },
      ]
    );
  };

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
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={brand.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>GRUP AYARLARI</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.form} contentContainerStyle={s.formContent}>
        <View style={s.field}>
          <Text style={s.label}>GRUP ADI</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={brand.textDim}
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>ACIKLAMA</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={brand.textDim}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Invite section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>DAVET</Text>
          {inviteCode ? (
            <View style={s.inviteRow}>
              <View style={s.inviteCodeBox}>
                <Text style={s.inviteCode}>{inviteCode}</Text>
              </View>
              <TouchableOpacity style={s.shareBtn} onPress={handleShareInvite}>
                <Ionicons name="share-outline" size={18} color={brand.bg} />
                <Text style={s.shareBtnText}>PAYLAS</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={s.generateBtn}
              onPress={handleGenerateInvite}
              disabled={generatingInvite}
            >
              {generatingInvite ? (
                <ActivityIndicator color={brand.accent} size="small" />
              ) : (
                <>
                  <Ionicons name="link-outline" size={18} color={brand.accent} />
                  <Text style={s.generateBtnText}>DAVET KODU OLUSTUR</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Danger zone */}
        <View style={s.section}>
          <Text style={s.dangerTitle}>TEHLIKELI BOLGE</Text>
          <TouchableOpacity style={s.dangerBtn} onPress={handleLeave}>
            <Ionicons name="exit-outline" size={18} color="#FF6B6B" />
            <Text style={s.dangerBtnText}>GRUPTAN AYRIL</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  form: { flex: 1 },
  formContent: { padding: 16, gap: 20 },
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
  section: { gap: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: brand.textMuted, letterSpacing: 2 },
  inviteRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  inviteCodeBox: {
    flex: 1,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inviteCode: { fontSize: 16, fontWeight: "bold", color: brand.accent, letterSpacing: 4, textAlign: "center" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: brand.accent,
    borderRadius: 8,
  },
  shareBtnText: { fontSize: 11, fontWeight: "700", color: brand.bg, letterSpacing: 1 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    borderStyle: "dashed",
  },
  generateBtnText: { fontSize: 12, fontWeight: "600", color: brand.accent, letterSpacing: 1 },
  dangerTitle: { fontSize: 11, fontWeight: "700", color: "#FF6B6B", letterSpacing: 2 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: "#FF6B6B30",
    borderRadius: 8,
  },
  dangerBtnText: { fontSize: 12, fontWeight: "600", color: "#FF6B6B", letterSpacing: 1 },
});
