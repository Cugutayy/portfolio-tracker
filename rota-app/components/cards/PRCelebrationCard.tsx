import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  distance: string; // "5K", "10K", etc.
  timeSec: number;
  improvement?: number | null; // percentage improvement
  previousBestSec?: number | null;
  onShare?: () => void;
  onDismiss?: () => void;
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PRCelebrationCard({ distance, timeSec, improvement, previousBestSec, onShare, onDismiss }: Props) {
  return (
    <LinearGradient
      colors={["#FFD700", "#FF8C00", "#FF6B35"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      {/* Decorative elements */}
      <View style={s.decorStar1}><Text style={{ fontSize: 16 }}>✦</Text></View>
      <View style={s.decorStar2}><Text style={{ fontSize: 12 }}>✦</Text></View>
      <View style={s.decorStar3}><Text style={{ fontSize: 20 }}>✦</Text></View>

      {/* Trophy */}
      <View style={s.trophyWrap}>
        <Ionicons name="trophy" size={48} color="#FFF" />
      </View>

      <Text style={s.congrats}>YENI KISISEL REKOR!</Text>
      <Text style={s.distance}>{distance}</Text>
      <Text style={s.time}>{formatTime(timeSec)}</Text>

      {improvement != null && improvement > 0 && (
        <View style={s.improvementRow}>
          <Ionicons name="arrow-up-circle" size={18} color="#FFF" />
          <Text style={s.improvementText}>
            {improvement.toFixed(1)}% iyilestirme
            {previousBestSec ? ` (onceki: ${formatTime(previousBestSec)})` : ""}
          </Text>
        </View>
      )}

      <View style={s.actions}>
        {onShare && (
          <TouchableOpacity style={s.shareBtn} onPress={onShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={16} color="#FF8C00" />
            <Text style={s.shareBtnText}>PAYLAS</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity style={s.dismissBtn} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={s.dismissText}>DEVAM</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 24, padding: 32, alignItems: "center", overflow: "hidden",
    shadowColor: "#FFD700", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  decorStar1: { position: "absolute", top: 20, left: 30, opacity: 0.4 },
  decorStar2: { position: "absolute", top: 60, right: 40, opacity: 0.3 },
  decorStar3: { position: "absolute", bottom: 80, left: 50, opacity: 0.25 },

  trophyWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  congrats: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.8)", letterSpacing: 4, marginBottom: 8 },
  distance: { fontSize: 48, fontWeight: "900", color: "#FFF", letterSpacing: 2 },
  time: { fontSize: 28, fontWeight: "700", color: "rgba(255,255,255,0.9)", marginTop: 4, marginBottom: 16 },

  improvementRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24 },
  improvementText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.9)" },

  actions: { flexDirection: "row", gap: 12 },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
  },
  shareBtnText: { fontSize: 13, fontWeight: "800", color: "#FF8C00", letterSpacing: 1 },
  dismissBtn: {
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)",
  },
  dismissText: { fontSize: 13, fontWeight: "700", color: "#FFF", letterSpacing: 1 },
});
