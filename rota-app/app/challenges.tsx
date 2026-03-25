import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  type: string;
  goalValue: number;
  startDate: string;
  endDate: string;
  status: string;
  participantCount: number;
  myProgress: number | null;
  hasJoined: boolean;
  creatorName: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: string; unit: string }> = {
  distance_total: { label: "Toplam Mesafe", icon: "map-outline", unit: "km" },
  run_count: { label: "Kosu Sayisi", icon: "footsteps-outline", unit: "kosu" },
  elevation_total: { label: "Toplam Yukseklik", icon: "trending-up-outline", unit: "m" },
  streak_days: { label: "Seri Gun", icon: "flame-outline", unit: "gun" },
};

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "upcoming" | "completed">("active");

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.getChallenges(tab) as { challenges: Challenge[] };
      setChallenges(res.challenges || []);
    } catch {}
    setLoading(false);
  }, [tab]);

  useFocusEffect(useCallback(() => { loadChallenges(); }, [loadChallenges]));

  const handleJoin = async (id: string) => {
    try {
      await API.joinChallenge(id);
      loadChallenges();
    } catch {}
  };

  const renderChallenge = ({ item }: { item: Challenge }) => {
    const info = TYPE_LABELS[item.type] || TYPE_LABELS.distance_total;
    const goalDisplay = item.type === "distance_total" ? (item.goalValue / 1000).toFixed(0) : String(item.goalValue);
    const progressDisplay = item.type === "distance_total" ? ((item.myProgress || 0) / 1000).toFixed(1) : String(Math.round(item.myProgress || 0));
    const progressPct = item.goalValue > 0 ? Math.min(100, ((item.myProgress || 0) / item.goalValue) * 100) : 0;
    const daysLeft = Math.max(0, Math.ceil((new Date(item.endDate).getTime() - Date.now()) / 86400000));

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/challenge/${item.id}` as never)}
      >
        <View style={s.cardHeader}>
          <View style={s.iconCircle}>
            <Ionicons name={info.icon as any} size={18} color={brand.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardMeta}>{info.label} · {item.participantCount} katilimci · {daysLeft} gun kaldi</Text>
          </View>
        </View>

        {item.description && <Text style={s.cardDesc}>{item.description}</Text>}

        {/* Progress */}
        {item.hasJoined ? (
          <View style={s.progressSection}>
            <View style={s.progressBarOuter}>
              <View style={[s.progressBarInner, { width: `${progressPct}%` }]} />
            </View>
            <Text style={s.progressText}>{progressDisplay} / {goalDisplay} {info.unit}</Text>
          </View>
        ) : (
          <TouchableOpacity style={s.joinBtn} onPress={() => handleJoin(item.id)}>
            <Text style={s.joinBtnText}>KATIL</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={brand.text} />
        </TouchableOpacity>
        <Text style={s.title}>CHALLENGE</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={s.tabs}>
        {(["active", "upcoming", "completed"] as const).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === "active" ? "AKTIF" : t === "upcoming" ? "YAKLASAN" : "BITEN"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        renderItem={renderChallenge}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={brand.accent} style={{ marginTop: 40 }} /> :
          <Text style={s.empty}>{tab === "active" ? "Aktif challenge yok" : tab === "upcoming" ? "Yaklasan challenge yok" : "Henuz tamamlanan yok"}</Text>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: brand.border },
  title: { fontSize: 14, fontWeight: "700", color: brand.text, letterSpacing: 3 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: brand.border },
  tabActive: { borderColor: brand.accent, backgroundColor: brand.accentDim },
  tabText: { fontSize: 11, fontWeight: "600", color: brand.textDim, letterSpacing: 1 },
  tabTextActive: { color: brand.accent },
  list: { padding: 16 },
  card: { backgroundColor: brand.surface, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: brand.accentDim, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: brand.text },
  cardMeta: { fontSize: 11, color: brand.textDim, marginTop: 2 },
  cardDesc: { fontSize: 13, color: brand.textMuted, marginBottom: 12 },
  progressSection: { marginTop: 8 },
  progressBarOuter: { height: 6, backgroundColor: brand.border, borderRadius: 3, overflow: "hidden" },
  progressBarInner: { height: 6, backgroundColor: brand.accent, borderRadius: 3 },
  progressText: { fontSize: 12, color: brand.textMuted, marginTop: 6, fontWeight: "600" },
  joinBtn: { marginTop: 8, backgroundColor: brand.accent, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  joinBtnText: { fontSize: 12, fontWeight: "700", color: brand.bg, letterSpacing: 2 },
  empty: { fontSize: 13, color: brand.textDim, textAlign: "center", marginTop: 40 },
});
