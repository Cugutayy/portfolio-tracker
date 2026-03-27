import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  emoji?: string;
  icon?: string;
  title: string;
  subtitle?: string;
  tier?: "bronze" | "silver" | "gold" | "platinum";
  earned?: boolean;
  size?: "small" | "medium" | "large";
}

const TIER_COLORS = {
  bronze: { bg: "#CD7F32", ring: "#A0522D", glow: "rgba(205,127,50,0.3)" },
  silver: { bg: "#C0C0C0", ring: "#808080", glow: "rgba(192,192,192,0.3)" },
  gold: { bg: "#FFD700", ring: "#DAA520", glow: "rgba(255,215,0,0.3)" },
  platinum: { bg: "#E5E4E2", ring: "#B0B0B0", glow: "rgba(229,228,226,0.4)" },
};

const SIZE_MAP = {
  small: { outer: 56, inner: 48, icon: 20, emoji: 22, title: 9 },
  medium: { outer: 72, inner: 62, icon: 26, emoji: 28, title: 10 },
  large: { outer: 96, inner: 84, icon: 36, emoji: 38, title: 12 },
};

export default function AchievementBadge({ emoji, icon, title, subtitle, tier = "gold", earned = true, size = "medium" }: Props) {
  const colors = TIER_COLORS[tier];
  const dim = SIZE_MAP[size];

  return (
    <View style={s.container}>
      {/* Outer hexagon-like ring */}
      <View style={[
        s.outerRing,
        {
          width: dim.outer, height: dim.outer, borderRadius: dim.outer / 2,
          backgroundColor: earned ? colors.ring : "#333",
          shadowColor: earned ? colors.bg : "transparent",
          shadowOpacity: earned ? 0.4 : 0,
          shadowRadius: 8,
        },
      ]}>
        {/* Inner badge */}
        <View style={[
          s.innerBadge,
          {
            width: dim.inner, height: dim.inner, borderRadius: dim.inner / 2,
            backgroundColor: earned ? colors.bg : "#1a1a1a",
          },
        ]}>
          {/* Highlight shine */}
          {earned && <View style={[s.shine, { width: dim.inner * 0.6, height: dim.inner * 0.3 }]} />}

          {emoji ? (
            <Text style={{ fontSize: dim.emoji, opacity: earned ? 1 : 0.3 }}>{emoji}</Text>
          ) : icon ? (
            <Ionicons name={icon as any} size={dim.icon} color={earned ? "#FFF" : "#555"} />
          ) : (
            <Ionicons name="trophy" size={dim.icon} color={earned ? "#FFF" : "#555"} />
          )}
        </View>
      </View>
      <Text style={[s.title, { fontSize: dim.title, color: earned ? "#E0E0E0" : "#555" }]} numberOfLines={2}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: "center", width: 80 },
  outerRing: { alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 2 } },
  innerBadge: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  shine: {
    position: "absolute", top: 4, left: "20%",
    backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  title: { fontWeight: "600", textAlign: "center", marginTop: 8, lineHeight: 14 },
  subtitle: { fontSize: 9, color: "#888", marginTop: 2, textAlign: "center" },
});
