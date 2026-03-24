import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Image,
  AppState,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { brand } from "@/constants/Colors";
import { API, type CommunityActivity, type EducationCard, type FeedItem, type LeaderboardEntry } from "@/lib/api";
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
  const [activeTab, setActiveTab] = useState<"following" | "everyone">("everyone");
  const [educationCards, setEducationCards] = useState<EducationCard[]>([]);
  const [smartFeed, setSmartFeed] = useState<FeedItem[]>([]);
  const loadingMoreRef = useRef(false);

  const fetchActivities = useCallback(async (pageNum: number, append: boolean) => {
    const offset = (pageNum - 1) * PAGE_SIZE;
    const res = await API.getCommunityActivities({
      period: "month",
      limit: String(PAGE_SIZE),
      offset: String(offset),
      filter: activeTab,
    });
    if (append) {
      setActivities((prev) => [...prev, ...res.activities]);
    } else {
      setActivities(res.activities);
      setEducationCards(res.educationCards || []);
    }
    setHasMore(res.hasMore);
  }, [activeTab]);

  const loadData = useCallback(async () => {
    try {
      const [, leaderboardRes, statsRes, smartFeedRes] = await Promise.allSettled([
        fetchActivities(1, false),
        API.getLeaderboard("month"),
        API.getStats(),
        API.getFeed(3),
      ]);
      setPage(1);
      if (leaderboardRes.status === "fulfilled") setLeaderboard(leaderboardRes.value.leaderboard.slice(0, 3));
      if (statsRes.status === "fulfilled") setStats(statsRes.value as typeof stats);
      if (smartFeedRes.status === "fulfilled") setSmartFeed(smartFeedRes.value.feed || []);
    } catch {}
  }, [fetchActivities]);

  useFocusEffect(
    useCallback(() => {
      loadData();

      const appStateRef = { current: true };
      const appStateSub = AppState.addEventListener("change", (state) => {
        appStateRef.current = state === "active";
      });
      const interval = setInterval(() => {
        if (appStateRef.current) {
          fetchActivities(1, false);
        }
      }, 60000);

      return () => {
        clearInterval(interval);
        appStateSub.remove();
      };
    }, [loadData, fetchActivities])
  );

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

  const switchTab = (tab: "following" | "everyone") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setActivities([]);
    setPage(1);
    setHasMore(true);
  };

  useEffect(() => {
    fetchActivities(1, false);
  }, [activeTab, fetchActivities]);

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

      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabButton, activeTab === "following" && s.tabButtonActive]}
          onPress={() => switchTab("following")}
        >
          <Text style={[s.tabText, activeTab === "following" && s.tabTextActive]}>TAKIP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabButton, activeTab === "everyone" && s.tabButtonActive]}
          onPress={() => switchTab("everyone")}
        >
          <Text style={[s.tabText, activeTab === "everyone" && s.tabTextActive]}>HERKES</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>SON KOSULAR</Text>

      {smartFeed.length > 0 && (
        <View style={s.smartFeedWrap}>
          <Text style={s.smartFeedTitle}>SANA OZEL</Text>
          {smartFeed.map((item) => (
            <TouchableOpacity key={item.id} style={s.smartFeedCard} onPress={() => router.push(`/activity/${item.payload.activityId}` as never)}>
              <Text style={s.smartFeedActor}>{item.actor.name}</Text>
              <Text style={s.smartFeedMeta}>{formatDistance(item.payload.distanceM)} km · skor {item.score.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {educationCards.map((card) => (
        <View key={card.id} style={s.educationCard}>
          <Text style={s.educationTitle}>{card.title.toUpperCase()}</Text>
          <Text style={s.educationBody}>{card.body}</Text>
          <TouchableOpacity
            style={s.educationBtn}
            onPress={async () => {
              if (card.eventNameOnAcknowledge) {
                await API.trackOnboardingEvent(card.eventNameOnAcknowledge).catch(() => null);
              }
              setEducationCards((prev) => prev.filter((c) => c.id !== card.id));
            }}
          >
            <Text style={s.educationBtnText}>{card.cta.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      ))}
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
          <View style={[s.onlineDot, { backgroundColor: (item as CommunityActivity & { memberIsOnline?: boolean }).memberIsOnline ? "#4CAF50" : "#666" }]} />
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

      {/* Activity photo */}
      {item.photoUrl && (
        <Image source={{ uri: item.photoUrl }} style={s.cardPhoto} resizeMode="cover" />
      )}

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
          !refreshing ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {activeTab === "following" ? "Henuz kimseyi takip etmiyorsun" : "Henuz kosu yok"}
              </Text>
              <Text style={s.emptySubtext}>
                {activeTab === "following"
                  ? "'Herkes' sekmesinden kosuculari kesfet!"
                  : "Strava'ni bagla veya bir kosuya basla!"}
              </Text>
            </View>
          ) : null
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
  smartFeedWrap: { marginBottom: 14 },
  smartFeedTitle: { fontSize: 11, color: brand.accent, letterSpacing: 2, fontWeight: "700", marginBottom: 8 },
  smartFeedCard: { backgroundColor: "#1A1A1F", borderWidth: 1, borderColor: "#2D2D35", borderRadius: 8, padding: 10, marginBottom: 6 },
  smartFeedActor: { color: brand.text, fontSize: 13, fontWeight: "700" },
  smartFeedMeta: { color: brand.textDim, fontSize: 12, marginTop: 2 },
  educationCard: { backgroundColor: "#141B22", borderWidth: 1, borderColor: "#2E3E50", borderRadius: 8, padding: 12, marginBottom: 14 },
  educationTitle: { color: brand.accent, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 6 },
  educationBody: { color: brand.text, fontSize: 13, lineHeight: 19 },
  educationBtn: { marginTop: 10, alignSelf: "flex-start", borderWidth: 1, borderColor: brand.accent, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  educationBtnText: { color: brand.accent, fontSize: 11, fontWeight: "700" },
  lbRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  lbRank: { fontSize: 14, fontWeight: "bold", width: 20, textAlign: "center" },
  lbAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  lbInitials: { fontSize: 10, color: brand.accent, fontWeight: "600" },
  lbName: { flex: 1, fontSize: 13, color: brand.text },
  lbKm: { fontSize: 13, color: brand.accent, fontWeight: "600" },
  tabRow: { flexDirection: "row", gap: 0, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: brand.border, borderRadius: 0 },
  tabButtonActive: { backgroundColor: brand.accent, borderColor: brand.accent },
  tabText: { fontSize: 11, fontWeight: "600", color: brand.textDim, letterSpacing: 2 },
  tabTextActive: { color: brand.bg },
  card: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, marginBottom: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  cardAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  cardInitials: { fontSize: 11, color: brand.accent, fontWeight: "600" },
  onlineDot: { position: "absolute" as const, bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: brand.surface },
  cardRunner: { fontSize: 13, color: brand.text, fontWeight: "500" },
  cardDate: { fontSize: 11, color: brand.textDim },
  cardTitle: { fontSize: 15, color: brand.text, fontWeight: "600", marginBottom: 8 },
  cardStats: { flexDirection: "row", gap: 16 },
  cardStat: { fontSize: 12, color: brand.textMuted },
  cardStatValue: { color: brand.accent, fontWeight: "600" },
  cardPhoto: { width: "100%", height: 200, borderRadius: 4, marginTop: 10 },
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
