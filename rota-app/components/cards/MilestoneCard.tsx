import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  type: "first_5k" | "first_10k" | "first_hm" | "first_marathon" | "streak_4" | "streak_12" | "runs_50" | "runs_100";
  onDismiss?: () => void;
  onShare?: () => void;
}

const MILESTONE_CONFIG: Record<string, { emoji: string; title: string; description: string; gradient: [string, string] }> = {
  first_5k: {
    emoji: "🏃", title: "Ilk 5K!",
    description: "Ilk 5 kilometrelik kosunu tamamladin. Harika bir baslangic!",
    gradient: ["#059669", "#34D399"],
  },
  first_10k: {
    emoji: "🔥", title: "10K Tamamlandi!",
    description: "10 kilometreyi geride biraktin. Ciddi bir kosucusun!",
    gradient: ["#D97706", "#FBBF24"],
  },
  first_hm: {
    emoji: "🏅", title: "Yari Maraton!",
    description: "21.1 km — yari maratonu tamamladin. Inanilmaz basari!",
    gradient: ["#7C3AED", "#A78BFA"],
  },
  first_marathon: {
    emoji: "🏆", title: "MARATON!",
    description: "42.195 km — bir maratonu bitirdin. Efsanesin!",
    gradient: ["#DC2626", "#F87171"],
  },
  streak_4: {
    emoji: "🔥", title: "4 Hafta Seri!",
    description: "Art arda 4 hafta kosu yaptin. Alistirma rutinin oturdu!",
    gradient: ["#EA580C", "#FB923C"],
  },
  streak_12: {
    emoji: "⚡", title: "12 Hafta Seri!",
    description: "3 ay boyunca her hafta kosun. Inanilmaz tutarlilik!",
    gradient: ["#4F46E5", "#818CF8"],
  },
  runs_50: {
    emoji: "💪", title: "50. Kosu!",
    description: "50 kosuyu tamamladin. Kosu senin icin bir yasam bicimi oldu!",
    gradient: ["#0891B2", "#22D3EE"],
  },
  runs_100: {
    emoji: "👑", title: "100. Kosu!",
    description: "Yuzyuncu kosun! Bir efsane olma yolundasin.",
    gradient: ["#BE185D", "#F472B6"],
  },
};

export default function MilestoneCard({ type, onDismiss, onShare }: Props) {
  const config = MILESTONE_CONFIG[type] || MILESTONE_CONFIG.first_5k;

  return (
    <LinearGradient
      colors={config.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      {/* Decorative rings */}
      <View style={s.ring1} />
      <View style={s.ring2} />

      <Text style={s.emoji}>{config.emoji}</Text>
      <Text style={s.congrats}>TEBRIKLER!</Text>
      <Text style={s.title}>{config.title}</Text>
      <Text style={s.description}>{config.description}</Text>

      <View style={s.actions}>
        {onShare && (
          <TouchableOpacity style={s.shareBtn} onPress={onShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={16} color={config.gradient[0]} />
            <Text style={[s.shareBtnText, { color: config.gradient[0] }]}>PAYLAS</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity style={s.dismissBtn} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={s.dismissText}>TAMAM</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 24, padding: 36, alignItems: "center", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
  },
  ring1: {
    position: "absolute", top: -40, right: -40, width: 140, height: 140,
    borderRadius: 70, borderWidth: 2, borderColor: "rgba(255,255,255,0.15)",
  },
  ring2: {
    position: "absolute", bottom: -20, left: -30, width: 100, height: 100,
    borderRadius: 50, borderWidth: 2, borderColor: "rgba(255,255,255,0.1)",
  },

  emoji: { fontSize: 64, marginBottom: 16 },
  congrats: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.7)", letterSpacing: 5, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: "900", color: "#FFF", textAlign: "center", marginBottom: 12 },
  description: { fontSize: 15, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 22, marginBottom: 28, maxWidth: 280 },

  actions: { flexDirection: "row", gap: 12 },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
  },
  shareBtnText: { fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  dismissBtn: {
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)",
  },
  dismissText: { fontSize: 13, fontWeight: "700", color: "#FFF", letterSpacing: 1 },
});
