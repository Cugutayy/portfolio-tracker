import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API, type Group, type LeaderboardEntry } from "@/lib/api";
import { formatDistance, formatPace, formatRelativeTime } from "@/lib/format";

type InnerTab = "feed" | "events" | "members" | "leaderboard";

const INNER_TABS: { key: InnerTab; label: string }[] = [
  { key: "feed", label: "FEED" },
  { key: "events", label: "ETKINLIKLER" },
  { key: "members", label: "UYELER" },
  { key: "leaderboard", label: "SKOR" },
];

const PERIOD_CHIPS = [
  { key: "week", label: "HAFTA" },
  { key: "month", label: "AY" },
];

export default function GroupDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [stats, setStats] = useState<{ totalMembers: number; totalRuns: number; totalDistanceM: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InnerTab>("feed");
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);

  // Feed state
  const [feedItems, setFeedItems] = useState<Array<{ type: string; data: any }>>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Members state
  const [members, setMembers] = useState<Array<{ id: string; name: string; image: string | null; role: string; isOnline: boolean }>>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbPeriod, setLbPeriod] = useState("month");
  const [lbLoading, setLbLoading] = useState(false);

  // Events state
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const fetchGroup = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await API.getGroup(slug);
      setGroup(res.group);
      setStats(res.stats);
    } catch {}
  }, [slug]);

  const fetchFeed = useCallback(async () => {
    if (!slug) return;
    setFeedLoading(true);
    try {
      const res = await API.getGroupFeed(slug, { limit: "20" });
      setFeedItems(res.items || []);
    } catch {}
    setFeedLoading(false);
  }, [slug]);

  const fetchMembers = useCallback(async () => {
    if (!slug) return;
    setMembersLoading(true);
    try {
      const res = await API.getGroupMembers(slug);
      setMembers(res.members || []);
    } catch {}
    setMembersLoading(false);
  }, [slug]);

  const fetchLeaderboard = useCallback(async () => {
    if (!slug) return;
    setLbLoading(true);
    try {
      const res = await API.getGroupLeaderboard(slug, lbPeriod);
      setLeaderboard(res.leaderboard || []);
    } catch {}
    setLbLoading(false);
  }, [slug, lbPeriod]);

  const fetchEvents = useCallback(async () => {
    if (!slug) return;
    setEventsLoading(true);
    try {
      const res = (await API.getEvents()) as { events: any[] };
      setEvents(res.events || []);
    } catch {}
    setEventsLoading(false);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    fetchGroup().finally(() => setLoading(false));
  }, [fetchGroup]);

  useEffect(() => {
    if (!slug) return;
    if (activeTab === "feed") fetchFeed();
    else if (activeTab === "members") fetchMembers();
    else if (activeTab === "leaderboard") fetchLeaderboard();
    else if (activeTab === "events") fetchEvents();
  }, [activeTab, slug, fetchFeed, fetchMembers, fetchLeaderboard, fetchEvents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGroup();
    if (activeTab === "feed") await fetchFeed();
    else if (activeTab === "members") await fetchMembers();
    else if (activeTab === "leaderboard") await fetchLeaderboard();
    else if (activeTab === "events") await fetchEvents();
    setRefreshing(false);
  };

  const handleJoinLeave = async () => {
    if (!slug || !group) return;
    setJoining(true);
    try {
      if (group.myRole) {
        await API.leaveGroup(slug);
      } else {
        await API.joinGroup(slug);
      }
      await fetchGroup();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Islem basarisiz");
    }
    setJoining(false);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const isAdmin = group?.myRole === "owner" || group?.myRole === "admin";

  if (loading || !group) {
    return (
      <SafeAreaView style={s.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Geri",
            headerTintColor: brand.accent,
            headerStyle: { backgroundColor: brand.bg },
          }}
        />
        <View style={s.loadingContainer}>
          <ActivityIndicator color={brand.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Group header */}
      <View style={s.groupHeader}>
        <View style={s.groupAvatarLarge}>
          {group.image ? (
            <Image source={{ uri: group.image }} style={s.groupAvatarLargeImg} />
          ) : (
            <Text style={s.groupInitialsLarge}>{getInitials(group.name)}</Text>
          )}
        </View>
        <Text style={s.groupName}>{group.name}</Text>
        {group.description && (
          <Text style={s.groupDesc}>{group.description}</Text>
        )}
        <Text style={s.memberCountText}>{stats?.totalMembers || group.memberCount} uye</Text>

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.joinLeaveBtn, group.myRole && s.joinLeaveBtnActive]}
            onPress={handleJoinLeave}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color={group.myRole ? brand.bg : brand.accent} size="small" />
            ) : (
              <Text style={[s.joinLeaveText, group.myRole && s.joinLeaveTextActive]}>
                {group.myRole ? "UYESIN \u2713" : "KATIL"}
              </Text>
            )}
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={s.settingsBtn}
              onPress={() => router.push(`/group-settings?slug=${slug}` as never)}
            >
              <Ionicons name="settings-outline" size={20} color={brand.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats row */}
      {stats && (
        <View style={s.statsRow}>
          {[
            { v: stats.totalMembers, l: "UYE" },
            { v: stats.totalRuns, l: "KOSU" },
            { v: ((stats.totalDistanceM || 0) / 1000).toFixed(0), l: "KM" },
          ].map((st) => (
            <View key={st.l} style={s.statBox}>
              <Text style={s.statValue}>{st.v}</Text>
              <Text style={s.statLabel}>{st.l}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Inner tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.innerTabScroll} contentContainerStyle={s.innerTabRow}>
        {INNER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.innerTab, activeTab === tab.key && s.innerTabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.innerTabText, activeTab === tab.key && s.innerTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period filter for leaderboard */}
      {activeTab === "leaderboard" && (
        <View style={s.periodRow}>
          {PERIOD_CHIPS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[s.periodChip, lbPeriod === p.key && s.periodChipActive]}
              onPress={() => setLbPeriod(p.key)}
            >
              <Text style={[s.periodChipText, lbPeriod === p.key && s.periodChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // Feed content
  const renderFeedItem = ({ item }: { item: { type: string; data: any } }) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => {
        if (item.type === "activity" && item.data.id) router.push(`/activity/${item.data.id}` as never);
        else if (item.type === "post" && item.data.id) router.push(`/post/${item.data.id}` as never);
      }}
    >
      <View style={s.cardHeader}>
        <View style={s.cardAvatar}>
          {item.data.memberImage ? (
            <Image source={{ uri: item.data.memberImage }} style={s.cardAvatarImg} />
          ) : (
            <Text style={s.cardInitials}>
              {(item.data.memberName || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardRunnerName}>{item.data.memberName || "Bilinmeyen"}</Text>
          <Text style={s.cardDate}>{formatRelativeTime(item.data.startTime || item.data.createdAt)}</Text>
        </View>
      </View>
      {item.data.title && <Text style={s.cardTitle}>{item.data.title}</Text>}
      {item.data.text && <Text style={s.cardText}>{item.data.text}</Text>}
      {item.type === "activity" && (
        <View style={s.cardStats}>
          <Text style={s.cardStat}>
            <Text style={s.cardStatValue}>{formatDistance(item.data.distanceM)}</Text> km
          </Text>
          <Text style={s.cardStat}>
            <Text style={s.cardStatValue}>{formatPace(item.data.avgPaceSecKm)}</Text> /km
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Members content
  const renderMember = ({ item }: { item: { id: string; name: string; image: string | null; role: string; isOnline: boolean } }) => (
    <TouchableOpacity
      style={s.memberRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/member/${item.id}` as never)}
    >
      <View style={s.memberAvatar}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={s.memberAvatarImg} />
        ) : (
          <Text style={s.memberInitials}>{getInitials(item.name)}</Text>
        )}
        <View style={[s.onlineDot, { backgroundColor: item.isOnline ? "#4CAF50" : "#666" }]} />
      </View>
      <Text style={s.memberName} numberOfLines={1}>{item.name}</Text>
      {(item.role === "owner" || item.role === "admin") && (
        <View style={[s.roleBadge, item.role === "owner" && s.roleBadgeOwner]}>
          <Text style={s.roleBadgeText}>{item.role === "owner" ? "KURUCU" : "ADMIN"}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Leaderboard content
  const MEDALS = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
  const renderLbEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <TouchableOpacity
      style={s.lbRow}
      onPress={() => router.push(`/member/${item.memberId}` as never)}
      activeOpacity={0.7}
    >
      <View style={s.lbRankCol}>
        {index < 3 ? (
          <Text style={s.lbMedal}>{MEDALS[index]}</Text>
        ) : (
          <Text style={s.lbRank}>{item.rank}</Text>
        )}
      </View>
      <View style={s.lbAvatar}>
        <Text style={s.lbInitials}>
          {item.memberName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
        </Text>
      </View>
      <View style={s.lbInfo}>
        <Text style={s.lbName} numberOfLines={1}>{item.memberName}</Text>
        <Text style={s.lbStats}>
          {item.totalRuns} kosu  {"\u00B7"}  {formatPace(item.avgPaceSecKm)} /km
        </Text>
      </View>
      <Text style={s.lbDistance}>{item.totalDistanceKm.toFixed(1)} km</Text>
    </TouchableOpacity>
  );

  // Event card
  const renderEventCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/event/${item.slug}` as never)}
    >
      <Text style={s.cardTitle}>{item.title}</Text>
      <Text style={s.cardDate}>
        {new Date(item.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </Text>
      {item.meetingPoint && (
        <View style={s.metaItem}>
          <Ionicons name="location-outline" size={12} color={brand.textDim} />
          <Text style={s.metaText}>{item.meetingPoint}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getTabData = () => {
    switch (activeTab) {
      case "feed": return feedItems;
      case "events": return events;
      case "members": return members;
      case "leaderboard": return leaderboard;
    }
  };

  const getTabRenderer = () => {
    switch (activeTab) {
      case "feed": return renderFeedItem;
      case "events": return renderEventCard;
      case "members": return renderMember;
      case "leaderboard": return renderLbEntry;
    }
  };

  const getTabLoading = () => {
    switch (activeTab) {
      case "feed": return feedLoading;
      case "events": return eventsLoading;
      case "members": return membersLoading;
      case "leaderboard": return lbLoading;
    }
  };

  const getKeyExtractor = () => {
    switch (activeTab) {
      case "feed": return (item: any, index: number) => `feed-${index}`;
      case "events": return (item: any) => item.id || item.slug;
      case "members": return (item: any) => item.id;
      case "leaderboard": return (item: any) => item.memberId;
    }
  };

  const tabData = getTabData();
  const tabLoading = getTabLoading();

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
        }}
      />

      <FlatList
        data={tabData as any[]}
        renderItem={getTabRenderer() as any}
        keyExtractor={getKeyExtractor() as any}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} />
        }
        ListEmptyComponent={
          tabLoading ? (
            <View style={s.tabLoadingContainer}>
              <ActivityIndicator color={brand.accent} />
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>Henuz icerik yok</Text>
            </View>
          )
        }
      />

      {/* FAB for feed and events */}
      {(activeTab === "feed" || activeTab === "events") && group.myRole && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => {
            if (activeTab === "feed") {
              router.push(`/create-post?groupId=${group.id}` as never);
            } else {
              router.push(`/create-event?groupId=${group.id}` as never);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={brand.bg} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabLoadingContainer: { paddingVertical: 40, alignItems: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 80 },

  // Group header
  groupHeader: { alignItems: "center", paddingVertical: 20 },
  groupAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brand.elevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  groupAvatarLargeImg: { width: 80, height: 80, borderRadius: 40 },
  groupInitialsLarge: { fontSize: 28, fontWeight: "bold", color: brand.accent },
  groupName: { fontSize: 20, fontWeight: "bold", color: brand.text, letterSpacing: 2, textAlign: "center" },
  groupDesc: { fontSize: 13, color: brand.textMuted, textAlign: "center", marginTop: 6, paddingHorizontal: 20 },
  memberCountText: { fontSize: 12, color: brand.textDim, marginTop: 8 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  joinLeaveBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: brand.accent,
    minWidth: 100,
    alignItems: "center",
  },
  joinLeaveBtnActive: { backgroundColor: brand.accent },
  joinLeaveText: { fontSize: 12, fontWeight: "700", color: brand.accent, letterSpacing: 1 },
  joinLeaveTextActive: { color: brand.bg },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginVertical: 16 },
  statBox: { flex: 1, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, padding: 12, borderRadius: 4, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },

  // Inner tabs
  innerTabScroll: { marginBottom: 12 },
  innerTabRow: { flexDirection: "row", gap: 0 },
  innerTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  innerTabActive: { borderBottomColor: brand.accent },
  innerTabText: { fontSize: 11, fontWeight: "600", color: brand.textDim, letterSpacing: 2 },
  innerTabTextActive: { color: brand.accent },

  // Period chips
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  periodChipActive: { borderColor: brand.accent, backgroundColor: "rgba(230,255,0,0.1)" },
  periodChipText: { fontSize: 11, fontWeight: "600", color: brand.textMuted, letterSpacing: 1 },
  periodChipTextActive: { color: brand.accent },

  // Cards
  card: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 16,
    marginBottom: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  cardAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  cardAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  cardInitials: { fontSize: 11, color: brand.accent, fontWeight: "600" },
  cardRunnerName: { fontSize: 13, color: brand.text, fontWeight: "500" },
  cardDate: { fontSize: 11, color: brand.textDim },
  cardTitle: { fontSize: 15, color: brand.text, fontWeight: "600", marginBottom: 4 },
  cardText: { fontSize: 14, color: brand.text, lineHeight: 20 },
  cardStats: { flexDirection: "row", gap: 16, marginTop: 6 },
  cardStat: { fontSize: 12, color: brand.textMuted },
  cardStatValue: { color: brand.accent, fontWeight: "600" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  metaText: { fontSize: 11, color: brand.textDim },

  // Members
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 6,
    gap: 10,
  },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  memberAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  memberInitials: { fontSize: 12, fontWeight: "bold", color: brand.accent },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: brand.surface,
  },
  memberName: { flex: 1, fontSize: 14, fontWeight: "600", color: brand.text },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: brand.border,
  },
  roleBadgeOwner: { backgroundColor: brand.accent + "30" },
  roleBadgeText: { fontSize: 9, fontWeight: "700", color: brand.textMuted, letterSpacing: 1 },

  // Leaderboard
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 6,
    gap: 10,
  },
  lbRankCol: { width: 28, alignItems: "center" },
  lbMedal: { fontSize: 18 },
  lbRank: { fontSize: 14, fontWeight: "bold", color: brand.textDim },
  lbAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  lbInitials: { fontSize: 12, fontWeight: "bold", color: brand.accent },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: "600", color: brand.text, marginBottom: 2 },
  lbStats: { fontSize: 11, color: brand.textDim },
  lbDistance: { fontSize: 14, fontWeight: "700", color: brand.accent },

  // Empty / FAB
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: brand.textMuted },
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
});
