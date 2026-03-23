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
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { brand } from "@/constants/Colors";
import { API, type CommunityActivity, type LeaderboardEntry, type Post } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { formatDistance, formatPace, formatDate, formatRelativeTime } from "@/lib/format";

const PAGE_SIZE = 20;

// Discriminated union for feed items
type FeedItem =
  | { type: "activity"; data: CommunityActivity }
  | { type: "post"; data: Post };

export default function FeedScreen() {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<{ members: number; totalRuns: number; totalDistanceKm: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [postPage, setPostPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<"following" | "everyone">("everyone");
  const [fabOpen, setFabOpen] = useState(false);
  const loadingMoreRef = useRef(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // Merge activities and posts into a single feed sorted by date
  const feedItems: FeedItem[] = (() => {
    const items: FeedItem[] = [
      ...activities.map((a): FeedItem => ({ type: "activity", data: a })),
      ...posts.map((p): FeedItem => ({ type: "post", data: p })),
    ];
    items.sort((a, b) => {
      const dateA = a.type === "activity" ? a.data.startTime : a.data.createdAt;
      const dateB = b.type === "activity" ? b.data.startTime : b.data.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    return items;
  })();

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
    }
    setHasMore(res.hasMore);
  }, [activeTab]);

  const fetchPosts = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const offset = (pageNum - 1) * PAGE_SIZE;
      const res = await API.getPosts({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        filter: activeTab,
      });
      if (append) {
        setPosts((prev) => [...prev, ...res.posts]);
      } else {
        setPosts(res.posts);
      }
      setHasMorePosts(res.hasMore);
    } catch {
      // Posts API might not be available yet, silently fail
      if (!append) setPosts([]);
    }
  }, [activeTab]);

  const loadData = useCallback(async () => {
    try {
      const [, , leaderboardRes, statsRes] = await Promise.allSettled([
        fetchActivities(1, false),
        fetchPosts(1, false),
        API.getLeaderboard("month"),
        API.getStats(),
      ]);
      setPage(1);
      setPostPage(1);
      if (leaderboardRes.status === "fulfilled") setLeaderboard(leaderboardRes.value.leaderboard.slice(0, 3));
      if (statsRes.status === "fulfilled") setStats(statsRes.value as typeof stats);
    } catch {}
  }, [fetchActivities, fetchPosts]);

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
          fetchPosts(1, false);
        }
      }, 60000);

      return () => {
        clearInterval(interval);
        appStateSub.remove();
      };
    }, [loadData, fetchActivities, fetchPosts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setPostPage(1);
    setHasMore(true);
    setHasMorePosts(true);
    await loadData();
    setRefreshing(false);
  };

  const loadMore = useCallback(async () => {
    if ((!hasMore && !hasMorePosts) || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const promises: Promise<void>[] = [];
    if (hasMore) {
      const nextPage = page + 1;
      promises.push(
        fetchActivities(nextPage, true).then(() => setPage(nextPage))
      );
    }
    if (hasMorePosts) {
      const nextPostPage = postPage + 1;
      promises.push(
        fetchPosts(nextPostPage, true).then(() => setPostPage(nextPostPage))
      );
    }
    try {
      await Promise.allSettled(promises);
    } catch {}
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }, [hasMore, hasMorePosts, page, postPage, fetchActivities, fetchPosts]);

  const switchTab = (tab: "following" | "everyone") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setActivities([]);
    setPosts([]);
    setPage(1);
    setPostPage(1);
    setHasMore(true);
    setHasMorePosts(true);
  };

  useEffect(() => {
    fetchActivities(1, false);
    fetchPosts(1, false);
  }, [activeTab, fetchActivities, fetchPosts]);

  // Optimistic kudos toggle for activities
  const handleActivityKudos = useCallback(async (activityId: string) => {
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
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId
            ? { ...a, hasKudosed: originalHasKudosed, kudosCount: originalKudosCount }
            : a
        )
      );
    }
  }, []);

  // Optimistic kudos toggle for posts
  const handlePostKudos = useCallback(async (postId: string) => {
    let originalHasKudosed = false;
    let originalKudosCount = 0;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        originalHasKudosed = p.hasKudosed;
        originalKudosCount = p.kudosCount;
        return {
          ...p,
          hasKudosed: !p.hasKudosed,
          kudosCount: p.kudosCount + (p.hasKudosed ? -1 : 1),
        };
      })
    );
    try {
      await API.togglePostKudos(postId);
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, hasKudosed: originalHasKudosed, kudosCount: originalKudosCount }
            : p
        )
      );
    }
  }, []);

  // FAB animation
  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnim, {
      toValue,
      useNativeDriver: true,
      friction: 6,
    }).start();
    setFabOpen(!fabOpen);
  };

  const MEDAL = ["#E6FF00", "#C0C0C0", "#CD7F32"];

  const renderHeader = () => (
    <View>
      <View style={s.header}>
        <Text style={s.logo}>ROTA<Text style={{ color: brand.accent }}>.</Text></Text>
        <TouchableOpacity onPress={() => router.push("/search" as never)} hitSlop={8}>
          <Ionicons name="search-outline" size={22} color={brand.textMuted} />
        </TouchableOpacity>
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
          <View style={s.leaderboardHeader}>
            <Text style={[s.sectionTitle, { marginBottom: 0 }]}>LIDER TABLOSU</Text>
            <TouchableOpacity onPress={() => router.push("/leaderboard" as never)} hitSlop={8}>
              <Text style={s.seeAllLink}>TUMUNU GOR</Text>
            </TouchableOpacity>
          </View>
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

      <Text style={s.sectionTitle}>SON PAYLASIMLAR</Text>
    </View>
  );

  const renderActivityCard = (item: CommunityActivity) => (
    <TouchableOpacity style={s.card} onPress={() => router.push(`/activity/${item.id}` as never)} activeOpacity={0.7}>
      <View style={s.cardHeader}>
        <TouchableOpacity
          style={s.cardAvatar}
          onPress={() => router.push(`/member/${item.memberId}` as never)}
        >
          {item.memberImage ? (
            <Image source={{ uri: item.memberImage }} style={s.cardAvatarImage} />
          ) : (
            <Text style={s.cardInitials}>{item.memberInitials}</Text>
          )}
          <View style={[s.onlineDot, { backgroundColor: item.memberIsOnline ? "#4CAF50" : "#666" }]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.cardRunner}>{item.memberName}</Text>
          <Text style={s.cardDate}>
            {formatDate(item.startTime)}
            {item.startLocation ? ` · ${item.startLocation}` : ""}
          </Text>
        </View>
      </View>
      <Text style={s.cardTitle}>{item.title}</Text>
      <View style={s.cardStats}>
        <Text style={s.cardStat}><Text style={s.cardStatValue}>{formatDistance(item.distanceM)}</Text> km</Text>
        <Text style={s.cardStat}><Text style={s.cardStatValue}>{formatPace(item.avgPaceSecKm)}</Text> /km</Text>
      </View>

      {item.photoUrl && (
        <Image source={{ uri: item.photoUrl }} style={s.cardPhoto} resizeMode="cover" />
      )}

      <View style={s.cardFooter}>
        <TouchableOpacity
          style={s.kudosButton}
          onPress={() => handleActivityKudos(item.id)}
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

  const renderPostCard = (item: Post) => {
    const photos = [item.photoUrl, item.photoUrl2, item.photoUrl3].filter(Boolean) as string[];
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => router.push(`/post/${item.id}` as never)}>
        <View style={s.cardHeader}>
          <TouchableOpacity
            style={s.cardAvatar}
            onPress={() => router.push(`/member/${item.memberId}` as never)}
          >
            {item.memberImage ? (
              <Image source={{ uri: item.memberImage }} style={s.cardAvatarImage} />
            ) : (
              <Text style={s.cardInitials}>{item.memberInitials}</Text>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.cardRunner}>{item.memberName}</Text>
            <Text style={s.cardDate}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
        </View>

        {item.text && <Text style={s.postText}>{item.text}</Text>}

        {photos.length === 1 && (
          <Image source={{ uri: photos[0] }} style={s.cardPhoto} resizeMode="cover" />
        )}

        {photos.length > 1 && (
          <View style={s.multiPhotoRow}>
            {photos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={s.multiPhotoThumb} resizeMode="cover" />
            ))}
          </View>
        )}

        <View style={s.cardFooter}>
          <TouchableOpacity
            style={s.kudosButton}
            onPress={() => handlePostKudos(item.id)}
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
            onPress={() => router.push(`/post/${item.id}` as never)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble-outline" size={16} color={brand.textDim} />
            <Text style={s.commentCount}>{item.commentCount || 0}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    if (item.type === "activity") return renderActivityCard(item.data);
    return renderPostCard(item.data);
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={s.footerLoader}>
          <ActivityIndicator color={brand.accent} size="small" />
        </View>
      );
    }
    if (!hasMore && !hasMorePosts && feedItems.length > 0) {
      return (
        <Text style={{ color: "#666", textAlign: "center", padding: 20, fontSize: 13 }}>
          Tum paylasimlar yuklendi
        </Text>
      );
    }
    return null;
  };

  // FAB menu item animation
  const fabMenuTranslate = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });
  const fabMenuOpacity = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const fabRotation = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={(item) => `${item.type}-${item.data.id}`}
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
                {activeTab === "following" ? "Henuz kimseyi takip etmiyorsun" : "Henuz paylasim yok"}
              </Text>
              <Text style={s.emptySubtext}>
                {activeTab === "following"
                  ? "'Herkes' sekmesinden kosuculari kesfet!"
                  : "Bir gonderi paylas veya kosuya basla!"}
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB Menu items */}
      {fabOpen && (
        <TouchableOpacity
          style={s.fabOverlay}
          activeOpacity={1}
          onPress={toggleFab}
        />
      )}

      <Animated.View
        style={[
          s.fabMenuItem,
          {
            bottom: 100,
            opacity: fabMenuOpacity,
            transform: [{ translateY: fabMenuTranslate }],
          },
        ]}
        pointerEvents={fabOpen ? "auto" : "none"}
      >
        <TouchableOpacity
          style={s.fabMenuButton}
          onPress={() => {
            toggleFab();
            router.push("/create-post" as never);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color={brand.bg} />
          <Text style={s.fabMenuLabel}>Gonderi Paylas</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={toggleFab} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
          <Ionicons name="add" size={28} color={brand.bg} />
        </Animated.View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  header: { paddingTop: 16, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: 24, fontWeight: "bold", color: brand.text, letterSpacing: 6 },
  statsRow: { flexDirection: "row", gap: 8, marginVertical: 16 },
  statBox: { flex: 1, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, padding: 16, borderRadius: 4, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },
  leaderboard: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, marginBottom: 16 },
  leaderboardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAllLink: { fontSize: 11, color: brand.accent, fontWeight: "700", letterSpacing: 1 },
  sectionTitle: { fontSize: 11, color: brand.textMuted, letterSpacing: 3, fontWeight: "600", marginBottom: 12 },
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
  cardAvatarImage: { width: 32, height: 32, borderRadius: 16 },
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

  // Post-specific styles
  postText: { fontSize: 14, color: brand.text, lineHeight: 20, marginBottom: 4 },
  multiPhotoRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  multiPhotoThumb: { flex: 1, height: 140, borderRadius: 4 },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: brand.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 5,
  },
  fabMenuItem: {
    position: "absolute",
    right: 20,
    zIndex: 8,
  },
  fabMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fabMenuLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: brand.bg,
  },
});
