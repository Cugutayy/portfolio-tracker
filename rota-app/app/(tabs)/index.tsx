import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API, type CommunityActivity, type LeaderboardEntry } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { formatDistance, formatPace, formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

export default function FeedScreen() {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<{ members: number; totalRuns: number; totalDistanceKm: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const fetchActivities = useCallback(async (pageNum: number, append: boolean) => {
    const offset = (pageNum - 1) * PAGE_SIZE;
    const res = await API.getCommunityActivities({
      period: "month",
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (append) {
      setActivities((prev) => [...prev, ...res.activities]);
    } else {
      setActivities(res.activities);
    }
    setHasMore(res.hasMore);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [, leaderboardRes, statsRes] = await Promise.allSettled([
        fetchActivities(1, false),
        API.getLeaderboard("month"),
        API.getStats(),
      ]);
      setPage(1);
      if (leaderboardRes.status === "fulfilled") setLeaderboard(leaderboardRes.value.leaderboard.slice(0, 3));
      if (statsRes.status === "fulfilled") setStats(statsRes.value as typeof stats);
    } catch {}
  }, [fetchActivities]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadData();
    setRefreshing(false);
  };

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      await fetchActivities(nextPage, true);
      setPage(nextPage);
    } catch {}
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }, [hasMore, page, fetchActivities]);

  // Optimistic kudos toggle
  const handleKudos = useCallback(async (activityId: string) => {
    // Store original state BEFORE toggle
    let originalHasKudosed = false;
    let originalKudosCount = 0;

    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== activityId) return a;
        originalHasKudosed = !!a.hasKudosed;
        originalKudosCount = a.kudosCount || 0;
        return {
          ...a,
          hasKudosed: !a.hasKudosed,
          kudosCount: (a.kudosCount || 0) + (a.hasKudosed ? -1 : 1),
        };
      })
    );
    try {
      await API.toggleKudos(activityId);
    } catch {
      // Revert to ORIGINAL state
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId
            ? { ...a, hasKudosed: originalHasKudosed, kudosCount: originalKudosCount }
            : a
        )
      );
    }
  }, []);

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
        <TouchableOpacity
          style={s.cardAvatar}
          onPress={() => router.push(`/member/${item.memberId}` as never)}
        >
          <Text style={s.cardInitials}>{item.memberInitials}</Text>
        </TouchableOpacity>
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

      {/* Kudos button */}
      <View style={s.cardFooter}>
        <TouchableOpacity
          style={s.kudosButton}
          onPress={() => handleKudos(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[s.kudosEmoji, item.hasKudosed && s.kudosActive]}>
            {"\uD83D\uDC4F"}
          </Text>
          <Text style={[s.kudosCount, item.hasKudosed && s.kudosCountActive]}>
            {item.kudosCount || 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.commentButton}
          onPress={() => router.push(`/activity/${item.id}` as never)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={brand.textDim} />
          <Text style={s.commentCount}>{item.commentCount || 0}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={s.footerLoader}>
          <ActivityIndicator color={brand.accent} size="small" />
        </View>
      );
    }
    if (!hasMore && activities.length > 0) {
      return (
        <Text style={{ color: "#666", textAlign: "center", padding: 20, fontSize: 13 }}>
          Tüm aktiviteler yüklendi
        </Text>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
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
  cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: brand.border },
  kudosButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  kudosEmoji: { fontSize: 16, opacity: 0.6 },
  kudosActive: { opacity: 1 },
  kudosCount: { fontSize: 12, color: brand.textDim, fontWeight: "500" },
  kudosCountActive: { color: brand.accent },
  commentButton: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 16 },
  commentCount: { fontSize: 12, color: brand.textDim, fontWeight: "500" },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 15, color: brand.textMuted },
  emptySubtext: { fontSize: 12, color: brand.textDim, marginTop: 4 },
});
