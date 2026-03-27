import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";

interface Props {
  title: string;
  description?: string | null;
  type: "distance_total" | "run_count" | "elevation_total" | "streak_days";
  goalValue: number;
  progress: number | null;
  participantCount: number;
  daysLeft: number;
  hasJoined: boolean;
  onJoin?: () => void;
  onPress?: () => void;
  variant?: "default" | "featured";
}

const TYPE_CONFIG: Record<string, { icon: string; gradient: [string, string]; unit: string }> = {
  distance_total: { icon: "map", gradient: ["#0D9488", "#10B981"], unit: "km" },
  run_count: { icon: "footsteps", gradient: ["#7C3AED", "#A855F7"], unit: "kosu" },
  elevation_total: { icon: "trending-up", gradient: ["#EA580C", "#F97316"], unit: "m" },
  streak_days: { icon: "flame", gradient: ["#DC2626", "#EF4444"], unit: "gun" },
};

export default function ChallengeCard({ title, description, type, goalValue, progress, participantCount, daysLeft, hasJoined, onJoin, onPress, variant = "default" }: Props) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.distance_total;
  const progressPct = goalValue > 0 ? Math.min(100, ((progress || 0) / goalValue) * 100) : 0;
  const goalDisplay = type === "distance_total" ? `${(goalValue / 1000).toFixed(0)}` : `${goalValue}`;
  const progressDisplay = type === "distance_total" ? `${((progress || 0) / 1000).toFixed(1)}` : `${Math.round(progress || 0)}`;
  const isFeatured = variant === "featured";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={config.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.card, isFeatured && s.cardFeatured]}
      >
        {/* Decorative circles */}
        <View style={s.decorCircle1} />
        <View style={s.decorCircle2} />

        {/* Header */}
        <View style={s.header}>
          <View style={s.iconWrap}>
            <Ionicons name={config.icon as any} size={isFeatured ? 24 : 20} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, isFeatured && s.titleFeatured]}>{title}</Text>
            <Text style={s.meta}>{participantCount} katilimci · {daysLeft} gun kaldi</Text>
          </View>
        </View>

        {description && <Text style={s.description} numberOfLines={2}>{description}</Text>}

        {/* Progress or Join */}
        {hasJoined ? (
          <View style={s.progressSection}>
            <View style={s.progressBarOuter}>
              <View style={[s.progressBarInner, { width: `${progressPct}%` }]} />
            </View>
            <View style={s.progressInfo}>
              <Text style={s.progressText}>{progressDisplay} / {goalDisplay} {config.unit}</Text>
              <Text style={s.progressPct}>{Math.round(progressPct)}%</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.joinBtn} onPress={onJoin} activeOpacity={0.8}>
            <Text style={s.joinText}>KATIL</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 18, padding: 20, overflow: "hidden", position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  cardFeatured: { paddingVertical: 28 },

  // Decorative background elements
  decorCircle1: {
    position: "absolute", top: -20, right: -20, width: 100, height: 100,
    borderRadius: 50, backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorCircle2: {
    position: "absolute", bottom: -30, left: -10, width: 80, height: 80,
    borderRadius: 40, backgroundColor: "rgba(255,255,255,0.06)",
  },

  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800", color: "#FFF", letterSpacing: 0.3 },
  titleFeatured: { fontSize: 20 },
  meta: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 3 },
  description: { fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 18, marginBottom: 14 },

  progressSection: { marginTop: 8 },
  progressBarOuter: { height: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden" },
  progressBarInner: { height: 8, backgroundColor: "#FFF", borderRadius: 4 },
  progressInfo: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  progressText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.9)" },
  progressPct: { fontSize: 13, fontWeight: "700", color: "#FFF" },

  joinBtn: {
    marginTop: 12, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 12,
    paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  joinText: { fontSize: 14, fontWeight: "800", color: "#FFF", letterSpacing: 2 },
});
