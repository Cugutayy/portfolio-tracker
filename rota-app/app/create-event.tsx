import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Platform, Switch,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import { CATEGORIES, CATEGORY_MAP, type EventCategory } from "@/constants/categories";

const MONTHS = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"];

const DURATION_OPTIONS = [
  { value: 60, label: "1 sa" },
  { value: 120, label: "2 sa" },
  { value: 240, label: "4 sa" },
  { value: 480, label: "Tum gun" },
] as const;

const WHEN_OPTIONS = [
  { key: "now", label: "Simdi" },
  { key: "today", label: "Bugun" },
  { key: "tomorrow", label: "Yarin" },
  { key: "custom", label: "Tarih Sec" },
] as const;

function formatDateTR(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTimeTR(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CreateEventScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();

  // Core fields
  const [category, setCategory] = useState<EventCategory>("spor");
  const [title, setTitle] = useState("");
  const [whenKey, setWhenKey] = useState<string>("today");
  const [saving, setSaving] = useState(false);

  // Location
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("Konum aliniyor...");

  // Details (collapsed by default)
  const [showDetails, setShowDetails] = useState(false);
  const [description, setDescription] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [approvalRequired, setApprovalRequired] = useState(false);

  // Date/time
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Get GPS location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("Konum izni verilmedi");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);

      // Reverse geocode
      try {
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (addr) {
          const parts = [addr.district || addr.subregion, addr.city].filter(Boolean);
          setLocationName(parts.join(", ") || "Konum alindi");
        }
      } catch {
        setLocationName("Konum alindi");
      }
    })();
  }, []);

  // Handle "when" quick buttons
  const handleWhen = (key: string) => {
    setWhenKey(key);
    const now = new Date();
    if (key === "now") {
      now.setMinutes(now.getMinutes() + 10);
      setEventDate(now);
    } else if (key === "today") {
      now.setHours(now.getHours() + 2, 0, 0, 0);
      setEventDate(now);
    } else if (key === "tomorrow") {
      now.setDate(now.getDate() + 1);
      now.setHours(10, 0, 0, 0);
      setEventDate(now);
    } else {
      setShowDatePicker(true);
    }
  };

  const onDateChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selected) {
      const updated = new Date(eventDate);
      updated.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setEventDate(updated);
    }
  };

  const onTimeChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selected) {
      const updated = new Date(eventDate);
      updated.setHours(selected.getHours(), selected.getMinutes());
      setEventDate(updated);
    }
  };

  const catDef = CATEGORY_MAP[category];

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Hata", "Etkinlik adi gerekli");
      return;
    }

    setSaving(true);
    try {
      await API.createEvent({
        title: title.trim(),
        description: description.trim() || null,
        meetingPoint: meetingPoint.trim() || null,
        date: eventDate.toISOString(),
        category,
        eventType: category, // backwards compat
        lat,
        lng,
        durationMinutes,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        approvalRequired,
        ...(groupId ? { groupId } : {}),
      } as any);
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
          <Ionicons name="close" size={24} color={brand.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>ETKINLIK OLUSTUR</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.form} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">

        {/* Category Grid */}
        <Text style={s.label}>KATEGORI</Text>
        <View style={s.catGrid}>
          {CATEGORIES.map((c) => {
            const selected = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[s.catItem, selected && { borderColor: c.color, backgroundColor: c.color + "18" }]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.7}
              >
                <View style={[s.catIconWrap, { backgroundColor: selected ? c.color : brand.elevated }]}>
                  <Ionicons name={c.icon as any} size={22} color={selected ? "#FFF" : brand.textMuted} />
                </View>
                <Text style={[s.catLabel, selected && { color: c.color, fontWeight: "700" }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <View style={s.field}>
          <Text style={s.label}>ETKINLIK ADI *</Text>
          <TextInput
            style={[s.input, { borderColor: catDef.color + "40" }]}
            value={title}
            onChangeText={setTitle}
            placeholder={catDef.placeholder}
            placeholderTextColor={brand.textDim}
          />
        </View>

        {/* Location */}
        <View style={s.field}>
          <Text style={s.label}>KONUM</Text>
          <View style={s.locationRow}>
            <Ionicons name="location" size={18} color={lat ? brand.accent : brand.textDim} />
            <Text style={[s.locationText, !lat && { color: brand.textDim }]}>{locationName}</Text>
          </View>
        </View>

        {/* When */}
        <View style={s.field}>
          <Text style={s.label}>NE ZAMAN</Text>
          <View style={s.whenRow}>
            {WHEN_OPTIONS.map((w) => (
              <TouchableOpacity
                key={w.key}
                style={[s.whenPill, whenKey === w.key && { borderColor: catDef.color, backgroundColor: catDef.color + "18" }]}
                onPress={() => handleWhen(w.key)}
              >
                <Text style={[s.whenText, whenKey === w.key && { color: catDef.color }]}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.dateDisplay} onPress={() => setShowTimePicker(true)}>
            <Text style={s.dateText}>{formatDateTR(eventDate)} · {formatTimeTR(eventDate)}</Text>
            <Ionicons name="chevron-forward" size={16} color={brand.textDim} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker value={eventDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onDateChange} minimumDate={new Date()} locale="tr" themeVariant="dark" />
        )}
        {showTimePicker && (
          <DateTimePicker value={eventDate} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onTimeChange} minuteInterval={5} locale="tr" themeVariant="dark" />
        )}

        {/* Duration */}
        <View style={s.field}>
          <Text style={s.label}>SURE</Text>
          <View style={s.whenRow}>
            {DURATION_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[s.whenPill, durationMinutes === d.value && { borderColor: catDef.color, backgroundColor: catDef.color + "18" }]}
                onPress={() => setDurationMinutes(d.value)}
              >
                <Text style={[s.whenText, durationMinutes === d.value && { color: catDef.color }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Toggle details */}
        <TouchableOpacity style={s.detailsToggle} onPress={() => setShowDetails(!showDetails)}>
          <Text style={s.detailsToggleText}>{showDetails ? "Detaylari Gizle" : "Detaylar Ekle"}</Text>
          <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={18} color={brand.textMuted} />
        </TouchableOpacity>

        {showDetails && (
          <>
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

            <View style={s.field}>
              <Text style={s.label}>MAKS KATILIMCI</Text>
              <TextInput
                style={[s.input, { width: 120 }]}
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                placeholder="20"
                placeholderTextColor={brand.textDim}
                keyboardType="numeric"
              />
            </View>

            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchLabel}>Katilim Onayi</Text>
                <Text style={s.switchDesc}>Katilimcilar senin onayini beklesin</Text>
              </View>
              <Switch
                value={approvalRequired}
                onValueChange={setApprovalRequired}
                trackColor={{ false: brand.border, true: catDef.color + "60" }}
                thumbColor={approvalRequired ? catDef.color : brand.textDim}
              />
            </View>
          </>
        )}

        {/* Create Button */}
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: catDef.color }, saving && s.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name={catDef.icon as any} size={20} color="#FFF" />
              <Text style={s.createBtnText}>OLUSTUR</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: brand.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 14, fontWeight: "bold", color: brand.text, letterSpacing: 3 },
  form: { flex: 1 },
  formContent: { padding: 16, gap: 18 },

  label: { fontSize: 10, fontWeight: "700", color: brand.textMuted, letterSpacing: 2, marginBottom: 2 },

  // Category grid
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catItem: {
    width: "22.5%", alignItems: "center", gap: 6,
    paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: brand.border, backgroundColor: brand.surface,
  },
  catIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  catLabel: { fontSize: 11, fontWeight: "600", color: brand.textMuted },

  field: { gap: 6 },
  input: {
    backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: brand.text,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },

  locationRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: brand.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: brand.border,
  },
  locationText: { fontSize: 14, color: brand.text, flex: 1 },

  whenRow: { flexDirection: "row", gap: 8 },
  whenPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: brand.border, backgroundColor: brand.surface,
  },
  whenText: { fontSize: 12, fontWeight: "600", color: brand.textMuted },

  dateDisplay: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 6, backgroundColor: brand.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: brand.border,
  },
  dateText: { fontSize: 13, fontWeight: "600", color: brand.text },

  detailsToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: brand.border,
  },
  detailsToggleText: { fontSize: 13, fontWeight: "600", color: brand.textMuted },

  switchRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: brand.surface, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: brand.border,
  },
  switchLabel: { fontSize: 14, fontWeight: "600", color: brand.text },
  switchDesc: { fontSize: 11, color: brand.textDim, marginTop: 2 },

  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 14, marginTop: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { fontSize: 15, fontWeight: "800", color: "#FFF", letterSpacing: 2 },
});
