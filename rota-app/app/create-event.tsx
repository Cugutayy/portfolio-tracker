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
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

const MONTHS = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"];

function formatDateTR(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTimeTR(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CreateEventScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [saving, setSaving] = useState(false);

  // Date/time state — default to tomorrow at 07:30
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 30, 0, 0);

  const [eventDate, setEventDate] = useState(tomorrow);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selected) {
      const updated = new Date(eventDate);
      updated.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setEventDate(updated);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selected) {
      const updated = new Date(eventDate);
      updated.setHours(selected.getHours(), selected.getMinutes());
      setEventDate(updated);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Hata", "Etkinlik adi gerekli");
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

        {/* Date & Time Pickers */}
        <View style={s.row}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>TARIH *</Text>
            <TouchableOpacity
              style={[s.pickerBtn, showDatePicker && s.pickerBtnActive]}
              onPress={() => { setShowTimePicker(false); setShowDatePicker(v => !v); }}
            >
              <Ionicons name="calendar-outline" size={16} color={showDatePicker ? brand.text : brand.accent} />
              <Text style={s.pickerText}>{formatDateTR(eventDate)}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: 12 }} />
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>SAAT *</Text>
            <TouchableOpacity
              style={[s.pickerBtn, showTimePicker && s.pickerBtnActive]}
              onPress={() => { setShowDatePicker(false); setShowTimePicker(v => !v); }}
            >
              <Ionicons name="time-outline" size={16} color={showTimePicker ? brand.text : brand.accent} />
              <Text style={s.pickerText}>{formatTimeTR(eventDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={eventDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            minimumDate={new Date()}
            locale="tr"
            themeVariant="dark"
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={eventDate}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onTimeChange}
            minuteInterval={5}
            locale="tr"
            themeVariant="dark"
          />
        )}

        <View style={s.field}>
          <Text style={s.label}>BULUSMA NOKTASI</Text>
          <TextInput
            style={s.input}
            value={meetingPoint}
            onChangeText={setMeetingPoint}
            placeholder="orn: Alsancak Kordon, Starbucks onu"
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
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnActive: { borderColor: brand.accent, backgroundColor: "rgba(230,255,0,0.08)" },
  pickerText: { fontSize: 14, color: brand.text, fontWeight: "600" },
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
