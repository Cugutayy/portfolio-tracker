import { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { brand } from "@/constants/Colors";
import { API, type CommunityActivity } from "@/lib/api";

// Mapbox haritasi — simdilik statik gorsel, Mapbox token eklenince canlanir
export default function MapScreen() {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.getCommunityActivities({ period: "month", limit: "100" })
      .then((data) => setActivities(data.activities))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>KOSU HARITASI</Text>
        <Text style={s.subtitle}>Toplulugun kostu yerleri kesfet</Text>
      </View>

      <View style={s.mapContainer}>
        {loading ? (
          <ActivityIndicator color={brand.accent} size="large" />
        ) : (
          <View style={s.mapPlaceholder}>
            <Text style={s.mapIcon}>🗺️</Text>
            <Text style={s.mapText}>IZMIR HARITASI</Text>
            <Text style={s.mapSubtext}>
              {activities.length} kosu bu bolgede
            </Text>
            <Text style={s.mapNote}>
              Harita WebView entegrasyonu sonraki guncelleme ile gelecek.{"\n"}
              Web versiyonunda harita aktif: alsancak-runners
            </Text>
          </View>
        )}
      </View>

      {/* Activity summary */}
      {activities.length > 0 && (
        <View style={s.summaryList}>
          {activities.slice(0, 5).map((act) => (
            <View key={act.id} style={s.summaryRow}>
              <View style={[s.dot, { backgroundColor: brand.accent }]} />
              <Text style={s.summaryName} numberOfLines={1}>{act.memberName}</Text>
              <Text style={s.summaryTitle} numberOfLines={1}>{act.title}</Text>
              <Text style={s.summaryKm}>{(act.distanceM / 1000).toFixed(1)} km</Text>
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: "bold", color: brand.text, letterSpacing: 4 },
  subtitle: { fontSize: 12, color: brand.textDim, letterSpacing: 1, marginTop: 2 },
  mapContainer: { flex: 1, margin: 16, borderWidth: 1, borderColor: brand.border, borderRadius: 8, overflow: "hidden", justifyContent: "center", alignItems: "center", backgroundColor: brand.surface },
  mapPlaceholder: { alignItems: "center", padding: 32 },
  mapIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
  mapText: { fontSize: 16, color: brand.textMuted, letterSpacing: 3, fontWeight: "600" },
  mapSubtext: { fontSize: 13, color: brand.textDim, marginTop: 8 },
  mapNote: { fontSize: 11, color: brand.textDim, marginTop: 16, textAlign: "center", lineHeight: 18 },
  summaryList: { paddingHorizontal: 16, paddingBottom: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: brand.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summaryName: { fontSize: 12, color: brand.textMuted, width: 80 },
  summaryTitle: { flex: 1, fontSize: 12, color: brand.text },
  summaryKm: { fontSize: 12, color: brand.accent, fontWeight: "600" },
});
