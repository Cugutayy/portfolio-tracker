import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import { getInitials, formatDuration, formatRelativeTime } from "@/lib/format";

interface ChallengeDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  goalValue: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface Participant {
  memberId: string;
  memberName: string;
  memberImage: string | null;
  progress: number;
  completedAt: string | null;
  joinedAt: string;
}

const TYPE_INFO: Record<string, { label: string; icon: string; unit: string; format: (v: number) => string }> = {
  distance_total: { label: "Toplam Mesafe", icon: "map-outline", unit: "km", format: (v) => (v / 1000).toFixed(1) },
  run_count: { label: "Kosu Sayisi", icon: "footsteps-outline", unit: "kosu", format: (v) => String(Math.round(v)) },
  elevation_total: { label: "Toplam Yukseklik", icon: "trending-up-outline", unit: "m", format: (v) => String(Math.round(v)) },
  streak_days: { label: "Seri Gun", icon: "flame-outline", unit: "gun", format: (v) => String(Math.round(v)) },
};

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<Participant[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [myProgress, setMyProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await API.getChallenge(id) as {
        challenge: ChallengeDetail;
        leaderboard: Participant[];
        hasJoined: boolean;
        myProgress: number | null;
      };
      setChallenge(res.challenge);
      setLeaderboard(res.leaderboard || []);
      setHasJoined(res.hasJoined);
      setMyProgress(res.myProgress);
    } catch {}
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    try {
      await API.joinChallenge(id);
      setHasJoined(true);
      setMyProgress(0);
      load();
    } catch {}
    setJoining(false);
  };

  if (loading) {
    return <SafeAreaView style={s.container}><ActivityIndicator color={brand.accent} size="large" style={{ marginTop: 60 }} /></SafeAreaView>;
  }

  if (!challenge) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Challenge bulunamadi</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>Geri don</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const info = TYPE_INFO[challenge.type] || TYPE_INFO.distance_total;
  const goalDisplay = info.format(challenge.goalValue);
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86400000));
  const myProgressDisplay = myProgress != null ? info.format(myProgress) : "0";
  const myPct = challenge.goalValue > 0 && myProgress != null ? Math.min(100, (myProgress / challenge.goalValue) * 100) : 0;

  const renderParticipant = ({ item, index }: { item: Participant; index: number }) => {
    const pct = challenge.goalValue > 0 ? Math.min(100, (item.progress / challenge.goalValue) * 100) : 0;
    return (
      <View style={s.participantRow}>
        <Text style={s.rank}>{index + 1}</Text>
        <View style={s.pAvatar}>
          {item.memberImage ? (
            <Image source={{ uri: item.memberImage }} style={s.pAvatarImg} />
          ) : (
            <Text style={s.pAvatarText}>{getInitials(item.memberName)}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.pName}>{item.memberName}</Text>
          <View style={s.pBarOuter}>
            <View style={[s.pBarInner, { width: `${pct}%` }]} />
          </View>
        </View>
        <Text style={s.pProgress}>{info.format(item.progress)} {info.unit}</Text>
        {item.completedAt && <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={brand.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>CHALLENGE</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.memberId}
        renderItem={renderParticipant}
        ListHeaderComponent={
          <View style={s.detailSection}>
            <View style={s.iconCircle}>
              <Ionicons name={info.icon as any} size={24} color={brand.accent} />
            </View>
            <Text style={s.challengeTitle}>{challenge.title}</Text>
            {challenge.description && <Text style={s.challengeDesc}>{challenge.description}</Text>}

            <View style={s.metaRow}>
              <Text style={s.metaItem}>{info.label}</Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaItem}>{leaderboard.length} katilimci</Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaItem}>{daysLeft} gun kaldi</Text>
            </View>

            {/* Goal */}
            <View style={s.goalCard}>
              <Text style={s.goalLabel}>Hedef: {goalDisplay} {info.unit}</Text>
              {hasJoined && (
                <>
                  <View style={s.goalBarOuter}>
                    <View style={[s.goalBarInner, { width: `${myPct}%` }]} />
                  </View>
                  <Text style={s.goalProgress}>{myProgressDisplay} / {goalDisplay} {info.unit} ({Math.round(myPct)}%)</Text>
                </>
              )}
            </View>

            {!hasJoined && (
              <TouchableOpacity style={s.joinBtn} onPress={handleJoin} disabled={joining}>
                <Text style={s.joinBtnText}>{joining ? "..." : "KATIL"}</Text>
              </TouchableOpacity>
            )}

            <Text style={s.leaderboardTitle}>SIRALAMA</Text>
          </View>
        }
        contentContainerStyle={s.list}
        ListEmptyComponent={<Text style={s.empty}>Henuz katilimci yok</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  errorText: { color: brand.textMuted, fontSize: 15, textAlign: "center", marginTop: 60 },
  backLink: { alignItems: "center", marginTop: 16 },
  backLinkText: { color: brand.accent, fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: brand.border },
  headerTitle: { fontSize: 14, fontWeight: "700", color: brand.text, letterSpacing: 3 },
  list: { padding: 16 },
  detailSection: { alignItems: "center", marginBottom: 24 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: brand.accentDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  challengeTitle: { fontSize: 22, fontWeight: "800", color: brand.text, textAlign: "center", marginBottom: 8 },
  challengeDesc: { fontSize: 14, color: brand.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  metaItem: { fontSize: 12, color: brand.textDim },
  metaDot: { fontSize: 12, color: brand.textDim },
  goalCard: { width: "100%", backgroundColor: brand.surface, borderRadius: 14, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: brand.border },
  goalLabel: { fontSize: 14, fontWeight: "700", color: brand.text, marginBottom: 12 },
  goalBarOuter: { height: 8, backgroundColor: brand.border, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  goalBarInner: { height: 8, backgroundColor: brand.accent, borderRadius: 4 },
  goalProgress: { fontSize: 12, color: brand.textMuted, fontWeight: "600" },
  joinBtn: { width: "100%", backgroundColor: brand.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 24 },
  joinBtnText: { fontSize: 14, fontWeight: "800", color: brand.bg, letterSpacing: 2 },
  leaderboardTitle: { fontSize: 12, fontWeight: "700", color: brand.textMuted, letterSpacing: 3, alignSelf: "flex-start", marginBottom: 8 },
  participantRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: brand.border },
  rank: { fontSize: 14, fontWeight: "700", color: brand.textDim, width: 24, textAlign: "center" },
  pAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, alignItems: "center", justifyContent: "center" },
  pAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  pAvatarText: { fontSize: 12, fontWeight: "700", color: brand.accent },
  pName: { fontSize: 14, fontWeight: "600", color: brand.text, marginBottom: 4 },
  pBarOuter: { height: 4, backgroundColor: brand.border, borderRadius: 2, overflow: "hidden" },
  pBarInner: { height: 4, backgroundColor: brand.accent, borderRadius: 2 },
  pProgress: { fontSize: 12, fontWeight: "600", color: brand.textMuted },
  empty: { fontSize: 13, color: brand.textDim, textAlign: "center", marginTop: 20 },
});
