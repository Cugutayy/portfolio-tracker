import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { formatDistance, formatPace, formatDuration } from "@/lib/format";

export default function RunSummaryScreen() {
  const params = useLocalSearchParams<{
    distanceM: string;
    movingTimeSec: string;
    elevationGainM: string;
    avgPaceSecKm: string;
    gpsQuality: string;
    startLocation: string;
    endLocation: string;
    splits: string;
  }>();

  const distanceM = Number(params.distanceM) || 0;
  const movingTimeSec = Number(params.movingTimeSec) || 0;
  const elevationGainM = Number(params.elevationGainM) || 0;
  const avgPaceSecKm = movingTimeSec > 0 && distanceM > 0
    ? movingTimeSec / (distanceM / 1000)
    : 0;
  const gpsQuality = Number(params.gpsQuality) || 0;
  const startLocation = params.startLocation || "";
  const endLocation = params.endLocation || "";
  const splits: Array<{ splitIndex: number; avgPaceSecKm: number; distanceM: number }> = (() => {
    try { return JSON.parse(params.splits || "[]"); } catch { return []; }
  })();

  // Find best split
  const bestSplit = splits.length > 0
    ? splits.reduce((best, s) => s.avgPaceSecKm > 0 && (best.avgPaceSecKm === 0 || s.avgPaceSecKm < best.avgPaceSecKm) ? s : best, splits[0])
    : null;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <Ionicons name="checkmark-circle" size={48} color={brand.accent} />
          <Text style={s.title}>Kosu Tamamlandi!</Text>
          {(startLocation || endLocation) && (
            <Text style={s.location}>
              {startLocation}{startLocation && endLocation ? " → " : ""}{endLocation}
            </Text>
          )}
        </View>

        {/* Main Stats */}
        <View style={s.mainStats}>
          <View style={s.mainStatItem}>
            <Text style={s.mainStatValue}>{formatDistance(distanceM)}</Text>
            <Text style={s.mainStatLabel}>KM</Text>
          </View>
          <View style={s.mainStatDivider} />
          <View style={s.mainStatItem}>
            <Text style={s.mainStatValue}>{formatDuration(movingTimeSec)}</Text>
            <Text style={s.mainStatLabel}>SURE</Text>
          </View>
          <View style={s.mainStatDivider} />
          <View style={s.mainStatItem}>
            <Text style={s.mainStatValue}>{formatPace(avgPaceSecKm)}</Text>
            <Text style={s.mainStatLabel}>TEMPO</Text>
          </View>
        </View>

        {/* Detail Stats */}
        <View style={s.detailGrid}>
          {elevationGainM > 0 && (
            <View style={s.detailItem}>
              <Ionicons name="trending-up" size={18} color={brand.accent} />
              <Text style={s.detailValue}>{Math.round(elevationGainM)} m</Text>
              <Text style={s.detailLabel}>Yukseklik</Text>
            </View>
          )}
          {bestSplit && bestSplit.avgPaceSecKm > 0 && (
            <View style={s.detailItem}>
              <Ionicons name="flash" size={18} color="#FFD700" />
              <Text style={s.detailValue}>{formatPace(bestSplit.avgPaceSecKm)}</Text>
              <Text style={s.detailLabel}>En iyi km</Text>
            </View>
          )}
          <View style={s.detailItem}>
            <Ionicons name="cellular" size={18} color={gpsQuality > 0.8 ? "#4CAF50" : gpsQuality > 0.5 ? "#FFC107" : "#FF5252"} />
            <Text style={s.detailValue}>{Math.round(gpsQuality * 100)}%</Text>
            <Text style={s.detailLabel}>GPS kalite</Text>
          </View>
        </View>

        {/* Splits */}
        {splits.length > 1 && (
          <View style={s.splitsSection}>
            <Text style={s.splitsTitle}>KM BAZINDA TEMPO</Text>
            {splits.map((split) => {
              const isBest = bestSplit && split.splitIndex === bestSplit.splitIndex;
              return (
                <View key={split.splitIndex} style={[s.splitRow, isBest && s.splitRowBest]}>
                  <Text style={s.splitKm}>{split.splitIndex + 1}</Text>
                  <View style={s.splitBarOuter}>
                    <View style={[
                      s.splitBar,
                      {
                        width: `${Math.min(100, Math.max(20, (1 - (split.avgPaceSecKm - 240) / 360) * 100))}%`,
                        backgroundColor: isBest ? brand.accent : brand.textDim,
                      },
                    ]} />
                  </View>
                  <Text style={[s.splitPace, isBest && s.splitPaceBest]}>{formatPace(split.avgPaceSecKm)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          style={s.doneButton}
          onPress={() => router.replace("/(tabs)" as never)}
          activeOpacity={0.7}
        >
          <Text style={s.doneButtonText}>FEED'E DON</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  content: { padding: 24, paddingBottom: 100 },

  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 22, fontWeight: "800", color: brand.text, marginTop: 12, letterSpacing: 1 },
  location: { fontSize: 13, color: brand.textDim, marginTop: 6, textAlign: "center" },

  mainStats: {
    flexDirection: "row", backgroundColor: brand.surface, borderRadius: 16, padding: 20,
    marginBottom: 20, alignItems: "center", justifyContent: "center",
  },
  mainStatItem: { flex: 1, alignItems: "center" },
  mainStatValue: { fontSize: 28, fontWeight: "800", color: brand.text },
  mainStatLabel: { fontSize: 10, color: brand.textDim, letterSpacing: 2, marginTop: 4, fontWeight: "600" },
  mainStatDivider: { width: 1, height: 40, backgroundColor: brand.border },

  detailGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  detailItem: {
    flex: 1, backgroundColor: brand.surface, borderRadius: 12, padding: 14, alignItems: "center", gap: 6,
  },
  detailValue: { fontSize: 16, fontWeight: "700", color: brand.text },
  detailLabel: { fontSize: 10, color: brand.textDim, letterSpacing: 1 },

  splitsSection: { backgroundColor: brand.surface, borderRadius: 12, padding: 16 },
  splitsTitle: { fontSize: 11, color: brand.textDim, letterSpacing: 2, fontWeight: "600", marginBottom: 12 },
  splitRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  splitRowBest: { backgroundColor: "rgba(230,255,0,0.06)", borderRadius: 6, marginHorizontal: -8, paddingHorizontal: 8 },
  splitKm: { fontSize: 13, color: brand.textMuted, fontWeight: "600", width: 20, textAlign: "center" },
  splitBarOuter: { flex: 1, height: 6, backgroundColor: brand.border, borderRadius: 3, overflow: "hidden" },
  splitBar: { height: 6, borderRadius: 3 },
  splitPace: { fontSize: 13, color: brand.textMuted, fontWeight: "600", width: 50, textAlign: "right" },
  splitPaceBest: { color: brand.accent, fontWeight: "800" },

  actions: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: brand.bg },
  doneButton: {
    backgroundColor: brand.accent, borderRadius: 12, paddingVertical: 16, alignItems: "center",
  },
  doneButtonText: { fontSize: 14, fontWeight: "800", color: brand.bg, letterSpacing: 2 },
});
