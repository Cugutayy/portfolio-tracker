import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API, type CommunityActivity, type LeaderboardEntry } from "@/lib/api";
import { formatDistance, formatPace, formatDate } from "@/lib/format";

export default function FeedScreen() {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<{ members: number; totalRuns: number; totalDistanceKm: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [activitiesRes, leaderboardRes, statsRes] = await Promise.allSettled([
        API.getCommunityActivities({ period: "month", limit: "30" }),
        API.getLeaderboard("month"),
        API.getStats(),
      ]);
      if (activitiesRes.status === "fulfilled") setActivities(activitiesRes.value.activities);
      if (leaderboardRes.status === "fulfilled") setLeaderboard(leaderboardRes.value.leaderboard.slice(0, 3));
      if (statsRes.status === "fulfilled") setStats(statsRes.value as typeof stats);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const MEDAL = ["#E6FF00", "#C0C0C0", "#CD7F32"];

  const renderHeader = () => (
    <View>
      <View style={s.header}>
        <Text style={s.logo}>ROTA<Text style={{ color: brand.accent }}>.</Text></Text>
      </View>

      {stats && (
        <View style={s.statsRow}>
          {[
            { v: stats.members, l: "UYE" },
            { v: stats.totalRuns, l: "KOSU" },
            { v: stats.totalDistanceKm, l: "KM" },
          ].map((s2) => (
            <View key={s2.l} style={s.statBox}>
              <Text style={s.statValue}>{s2.v}</Text>
              <Text style={s.statLabel}>{s2.l}</Text>
            </View>
          ))}
        </View>
      )}

      {leaderboard.length > 0 && (
        <View style={s.leaderboard}>
          <Text style={s.sectionTitle}>LIDER TABLOSU</Text>
          {leaderboard.map((entry, i) => (
            <View key={entry.memberId} style={s.lbRow}>
              <Text style={[s.lbRank, { color: MEDAL[i] || brand.textDim }]}>{entry.rank}</Text>
              <View style={s.lbAvatar}>
                <Text style={s.lbInitials}>
                  {entry.memberName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </Text>
              </View>
              <Text style={s.lbName}>{entry.memberName}</Text>
              <Text style={s.lbKm}>{entry.totalDistanceKm} km</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.sectionTitle}>SON KOSULAR</Text>
    </View>
  );

  const renderActivity = ({ item }: { item: CommunityActivity }) => (
    <TouchableOpacity style={s.card} onPress={() => router.push(`/activity/${item.id}` as never)} activeOpacity={0.7}>
      <View style={s.cardHeader}>
        <View style={s.cardAvatar}>
          <Text style={s.cardInitials}>{item.memberInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardRunner}>{item.memberName}</Text>
          <Text style={s.cardDate}>{formatDate(item.startTime)}</Text>
        </View>
      </View>
      <Text style={s.cardTitle}>{item.title}</Text>
      <View style={s.cardStats}>
        <Text style={s.cardStat}><Text style={s.cardStatValue}>{formatDistance(item.distanceM)}</Text> km</Text>
        <Text style={s.cardStat}><Text style={s.cardStatValue}>{formatPace(item.avgPaceSecKm)}</Text> /km</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Henuz kosu yok</Text>
            <Text style={s.emptySubtext}>Strava'ni bagla veya bir kosuya basla!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  header: { paddingTop: 16, paddingBottom: 8 },
  logo: { fontSize: 24, fontWeight: "bold", color: brand.text, letterSpacing: 6 },
  statsRow: { flexDirection: "row", gap: 8, marginVertical: 16 },
  statBox: { flex: 1, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, padding: 16, borderRadius: 4, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },
  leaderboard: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: brand.textMuted, letterSpacing: 3, fontWeight: "600", marginBottom: 12 },
  lbRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  lbRank: { fontSize: 14, fontWeight: "bold", width: 20, textAlign: "center" },
  lbAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  lbInitials: { fontSize: 10, color: brand.accent, fontWeight: "600" },
  lbName: { flex: 1, fontSize: 13, color: brand.text },
  lbKm: { fontSize: 13, color: brand.accent, fontWeight: "600" },
  card: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, marginBottom: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  cardAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  cardInitials: { fontSize: 11, color: brand.accent, fontWeight: "600" },
  cardRunner: { fontSize: 13, color: brand.text, fontWeight: "500" },
  cardDate: { fontSize: 11, color: brand.textDim },
  cardTitle: { fontSize: 15, color: brand.text, fontWeight: "600", marginBottom: 8 },
  cardStats: { flexDirection: "row", gap: 16 },
  cardStat: { fontSize: 12, color: brand.textMuted },
  cardStatValue: { color: brand.accent, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 15, color: brand.textMuted },
  emptySubtext: { fontSize: 12, color: brand.textDim, marginTop: 4 },
});
