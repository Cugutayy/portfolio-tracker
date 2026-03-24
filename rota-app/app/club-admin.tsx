import { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

export default function ClubAdminScreen() {
  const [clubId, setClubId] = useState("");
  const [targetKm, setTargetKm] = useState("120");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ completionPercent: number; distanceM: number; targetDistanceM: number } | null>(null);

  const loadGoal = async () => {
    if (!clubId.trim()) return Alert.alert("Uyari", "Club ID gerekli");
    setLoading(true);
    try {
      const res = await API.getClubWeeklyGoal(clubId.trim());
      setProgress(res.progress);
    } catch {
      Alert.alert("Hata", "Kulup hedefi yuklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const saveGoal = async () => {
    const km = Number(targetKm);
    if (!clubId.trim() || !Number.isFinite(km) || km <= 0) {
      return Alert.alert("Uyari", "Gecerli Club ID ve hedef km gir");
    }

    setLoading(true);
    try {
      await API.setClubWeeklyGoal(clubId.trim(), Math.round(km * 1000));
      await loadGoal();
      Alert.alert("Basarili", "Haftalik hedef guncellendi");
    } catch {
      Alert.alert("Hata", "Haftalik hedef kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Ionicons name="business-outline" size={18} color={brand.accent} />
        <Text style={s.title}>Club Admin</Text>
      </View>

      <Text style={s.label}>Club ID</Text>
      <TextInput style={s.input} placeholder="uuid..." placeholderTextColor="#6B6B70" value={clubId} onChangeText={setClubId} />

      <Text style={s.label}>Haftalik hedef (km)</Text>
      <TextInput style={s.input} keyboardType="numeric" placeholder="120" placeholderTextColor="#6B6B70" value={targetKm} onChangeText={setTargetKm} />

      <View style={s.row}>
        <TouchableOpacity style={[s.btn, s.secondary]} onPress={loadGoal} disabled={loading}>
          <Text style={s.secondaryText}>Hedefi Getir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={saveGoal} disabled={loading}>
          <Text style={s.btnText}>Kaydet</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={brand.accent} style={{ marginTop: 16 }} />}

      {progress && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Bu hafta ilerleme</Text>
          <Text style={s.cardValue}>{(progress.distanceM / 1000).toFixed(1)} / {(progress.targetDistanceM / 1000).toFixed(1)} km</Text>
          <Text style={s.cardSub}>{progress.completionPercent}% tamamlandi</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  title: { color: brand.text, fontSize: 22, fontWeight: "900" },
  label: { color: brand.textDim, marginBottom: 8, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#2B2B31",
    backgroundColor: "#121216",
    color: brand.text,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: brand.accent,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  btnText: { color: brand.bg, fontWeight: "800" },
  secondary: { backgroundColor: "#1F1F24", borderWidth: 1, borderColor: "#2F2F36" },
  secondaryText: { color: brand.text },
  card: {
    marginTop: 20,
    backgroundColor: "#16161A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2E2E35",
    padding: 14,
  },
  cardTitle: { color: brand.textDim, fontSize: 12, fontWeight: "700" },
  cardValue: { color: brand.text, fontSize: 22, fontWeight: "900", marginTop: 4 },
  cardSub: { color: brand.accent, fontSize: 13, marginTop: 2 },
});
