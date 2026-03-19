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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

export default function CreateEventScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Hata", "Etkinlik adi gerekli");
      return;
    }
    if (!dateStr.trim() || !timeStr.trim()) {
      Alert.alert("Hata", "Tarih ve saat gerekli (orn: 25.03.2026 ve 07:30)");
      return;
    }

    // Parse date from DD.MM.YYYY format
    const dateParts = dateStr.trim().split(/[./\-]/);
    if (dateParts.length !== 3) {
      Alert.alert("Hata", "Tarih formati: GG.AA.YYYY (orn: 25.03.2026)");
      return;
    }
    const [day, month, year] = dateParts.map(Number);

    // Parse time from HH:MM format
    const timeParts = timeStr.trim().split(":");
    if (timeParts.length !== 2) {
      Alert.alert("Hata", "Saat formati: SS:DD (orn: 07:30)");
      return;
    }
    const [hour, minute] = timeParts.map(Number);

    const eventDate = new Date(year, month - 1, day, hour, minute);
    if (isNaN(eventDate.getTime())) {
      Alert.alert("Hata", "Gecersiz tarih veya saat");
      return;
    }
    if (eventDate < new Date()) {
      Alert.alert("Hata", "Etkinlik tarihi gelecekte olmali");
      return;
    }

    setSaving(true);
    try {
      await API.createEvent({
        title: title.trim(),
        description: description.trim() || null,
        meetingPoint: meetingPoint.trim() || null,
        distanceM: distanceKm ? Math.round(parseFloat(distanceKm) * 1000) : null,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        date: eventDate.toISOString(),
        eventType: "group_run",
      });
      Alert.alert("Basarili", "Etkinlik olusturuldu!", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Etkinlik olusturulamadi");
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
        <Text style={s.headerTitle}>ETKINLIK OLUSTUR</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.form} contentContainerStyle={s.formContent}>
        <View style={s.field}>
          <Text style={s.label}>ETKINLIK ADI *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="orn: Kordon Sabah Kosusu"
            placeholderTextColor={brand.textDim}
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>ACIKLAMA</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Etkinlik hakkinda detaylar..."
            placeholderTextColor={brand.textDim}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={s.row}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>TARIH *</Text>
            <TextInput
              style={s.input}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="25.03.2026"
              placeholderTextColor={brand.textDim}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>SAAT *</Text>
            <TextInput
              style={s.input}
              value={timeStr}
              onChangeText={setTimeStr}
              placeholder="07:30"
              placeholderTextColor={brand.textDim}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>BULUSMA NOKTASI</Text>
          <TextInput
            style={s.input}
            value={meetingPoint}
            onChangeText={setMeetingPoint}
            placeholder="orn: Alsancak Kordon, Starbucks onü"
            placeholderTextColor={brand.textDim}
          />
        </View>

        <View style={s.row}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>MESAFE (KM)</Text>
            <TextInput
              style={s.input}
              value={distanceKm}
              onChangeText={setDistanceKm}
              placeholder="5"
              placeholderTextColor={brand.textDim}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>MAKS KATILIMCI</Text>
            <TextInput
              style={s.input}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              placeholder="20"
              placeholderTextColor={brand.textDim}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[s.createBtn, saving && s.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={brand.bg} />
          ) : (
            <Text style={s.createBtnText}>ETKINLIK OLUSTUR</Text>
          )}
        </TouchableOpacity>
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
  form: { flex: 1 },
  formContent: { padding: 16, gap: 16 },
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
  row: { flexDirection: "row" },
  createBtn: {
    backgroundColor: brand.accent,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { fontSize: 14, fontWeight: "bold", color: brand.bg, letterSpacing: 2 },
});
