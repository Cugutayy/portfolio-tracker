import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";

interface Props {
  monthName: string; // "Mart 2026"
  totalDistanceKm: number;
  totalRuns: number;
  totalTimeSec: number;
  streakWeeks: number;
  longestRunKm: number;
  avgPace: string; // "5:30"
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} sa ${m} dk`;
  return `${m} dk`;
}

export default function MonthlyRecapCard({ monthName, totalDistanceKm, totalRuns, totalTimeSec, streakWeeks, longestRunKm, avgPace }: Props) {
  return (
    <LinearGradient
      colors={[brand.bg, "#0F2027", "#203A43"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      {/* Decorative */}
      <View style={s.decorLine} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.monthLabel}>AYLIK OZET</Text>
        <Text style={s.monthName}>{monthName}</Text>
      </View>

      {/* Hero stat */}
      <View style={s.heroSection}>
        <Text style={s.heroValue}>{totalDistanceKm.toFixed(1)}</Text>
        <Text style={s.heroUnit}>km</Text>
      </View>
      <Text style={s.heroSub}>{totalRuns} kosu · {formatDuration(totalTimeSec)}</Text>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        <View style={s.statItem}>
          <Ionicons name="speedometer-outline" size={18} color={brand.accent} />
          <Text style={s.statValue}>{avgPace}</Text>
          <Text style={s.statLabel}>Ort. Tempo</Text>
        </View>
        <View style={s.statItem}>
          <Ionicons name="resize-outline" size={18} color={brand.accent} />
          <Text style={s.statValue}>{longestRunKm.toFixed(1)} km</Text>
          <Text style={s.statLabel}>En Uzun</Text>
        </View>
        <View style={s.statItem}>
          <Ionicons name="flame-outline" size={18} color="#FF6B35" />
          <Text style={s.statValue}>{streakWeeks}</Text>
          <Text style={s.statLabel}>Hafta Seri</Text>
        </View>
      </View>

      {/* Branding */}
      <View style={s.branding}>
        <Text style={s.brandText}>ROTA<Text style={{ color: brand.accent }}>.</Text></Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20, padding: 28, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  decorLine: {
    position: "absolute", top: 0, left: 0, right: 0, height: 3,
    backgroundColor: brand.accent,
  },

  header: { marginBottom: 24 },
  monthLabel: { fontSize: 11, fontWeight: "700", color: brand.accent, letterSpacing: 4, marginBottom: 4 },
  monthName: { fontSize: 22, fontWeight: "800", color: "#FFF" },

  heroSection: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 4 },
  heroValue: { fontSize: 56, fontWeight: "900", color: "#FFF", lineHeight: 60 },
  heroUnit: { fontSize: 22, fontWeight: "600", color: "rgba(255,255,255,0.5)", marginBottom: 8 },
  heroSub: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 28 },

  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  statItem: { alignItems: "center", gap: 6 },
  statValue: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1 },

  branding: { alignItems: "center", paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  brandText: { fontSize: 16, fontWeight: "800", color: "rgba(255,255,255,0.3)", letterSpacing: 6 },
});
