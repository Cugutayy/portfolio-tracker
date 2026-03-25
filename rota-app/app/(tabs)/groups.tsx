import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { brand } from "@/constants/Colors";
import { API, type Group } from "@/lib/api";
import { getInitials } from "@/lib/format";

const SPORT_LABELS: Record<string, string> = {
  running: "Kosu",
  cycling: "Bisiklet",
  swimming: "Yuzme",
  walking: "Yuruyus",
  other: "Diger",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "KURUCU",
  admin: "ADMIN",
  member: "UYE",
};

export default function GroupsScreen() {
  const [activeTab, setActiveTab] = useState<"my" | "discover">("my");
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

  const fetchMyGroups = useCallback(async () => {
    try {
      const res = await API.getMyGroups();
      setMyGroups(res.groups || []);
    } catch {
      // silently fail
    }
  }, []);

  const fetchDiscoverGroups = useCallback(async (q?: string) => {
    try {
      const params: Record<string, string> = {};
      if (q && q.trim().length >= 2) params.q = q.trim();
      const res = await API.getGroups(params);
      setDiscoverGroups(res.groups || []);
    } catch {
      // silently fail
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.allSettled([fetchMyGroups(), fetchDiscoverGroups()]).finally(() =>
        setLoading(false)
      );
    }, [fetchMyGroups, fetchDiscoverGroups])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "my") {
      await fetchMyGroups();
    } else {
      await fetchDiscoverGroups(searchText);
    }
    setRefreshing(false);
  };

  const handleJoin = async (slug: string) => {
    setJoiningSlug(slug);
    try {
      await API.joinGroup(slug);
      await Promise.allSettled([fetchMyGroups(), fetchDiscoverGroups(searchText)]);
    } catch {}
    setJoiningSlug(null);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim().length >= 2) {
      fetchDiscoverGroups(text);
    } else if (text.trim().length === 0) {
      fetchDiscoverGroups();
    }
  };

  // getInitials imported from @/lib/format

  const renderGroupCard = (item: Group, showJoin: boolean) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/group/${item.slug}` as never)}
    >
      <View style={s.cardRow}>
        <View style={s.groupAvatar}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={s.groupAvatarImg} />
          ) : (
            <Text style={s.groupInitials}>{getInitials(item.name)}</Text>
          )}
        </View>
        <View style={s.cardInfo}>
          <Text style={s.groupName} numberOfLines={1}>{item.name}</Text>
          <View style={s.cardMeta}>
            <Text style={s.memberCount}>{item.memberCount} uye</Text>
            <View style={s.sportBadge}>
              <Text style={s.sportBadgeText}>
                {SPORT_LABELS[item.sportType] || item.sportType}
              </Text>
            </View>
            {item.myRole && (
              <View style={[s.roleBadge, item.myRole === "owner" && s.roleBadgeOwner]}>
                <Text style={s.roleBadgeText}>
                  {ROLE_LABELS[item.myRole] || item.myRole.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
        {showJoin && !item.myRole && (
          <TouchableOpacity
            style={s.joinBtn}
            onPress={() => handleJoin(item.slug)}
            disabled={joiningSlug === item.slug}
          >
            {joiningSlug === item.slug ? (
              <ActivityIndicator color={brand.bg} size="small" />
            ) : (
              <Text style={s.joinBtnText}>KATIL</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator color={brand.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>GRUPLAR</Text>
      </View>

      {/* Segment control */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabButton, activeTab === "my" && s.tabButtonActive]}
          onPress={() => setActiveTab("my")}
        >
          <Text style={[s.tabText, activeTab === "my" && s.tabTextActive]}>GRUPLARIM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabButton, activeTab === "discover" && s.tabButtonActive]}
          onPress={() => setActiveTab("discover")}
        >
          <Text style={[s.tabText, activeTab === "discover" && s.tabTextActive]}>KESFET</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "discover" && (
        <View style={s.searchContainer}>
          <Ionicons name="search-outline" size={18} color={brand.textDim} />
          <TextInput
            style={s.searchInput}
            value={searchText}
            onChangeText={handleSearch}
            placeholder="Grup ara..."
            placeholderTextColor={brand.textDim}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={18} color={brand.textDim} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === "my" ? (
        <FlatList
          data={myGroups}
          renderItem={({ item }) => renderGroupCard(item, false)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={brand.textDim} />
              <Text style={s.emptyText}>Henuz bir gruba katilmadiniz</Text>
              <TouchableOpacity
                style={s.discoverBtn}
                onPress={() => setActiveTab("discover")}
              >
                <Text style={s.discoverBtnText}>GRUPLARI KESFET</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={discoverGroups}
          renderItem={({ item }) => renderGroupCard(item, true)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="search-outline" size={48} color={brand.textDim} />
              <Text style={s.emptyText}>Grup bulunamadi</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push("/create-group" as never)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={brand.bg} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: "bold", color: brand.text, letterSpacing: 4 },
  tabRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: brand.border },
  tabButtonActive: { backgroundColor: brand.accent, borderColor: brand.accent },
  tabText: { fontSize: 11, fontWeight: "600", color: brand.textDim, letterSpacing: 2 },
  tabTextActive: { color: brand.bg },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: brand.text, paddingVertical: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 80, gap: 8 },
  card: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brand.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  groupInitials: { fontSize: 16, fontWeight: "bold", color: brand.accent },
  cardInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: "700", color: brand.text, letterSpacing: 0.5, marginBottom: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  memberCount: { fontSize: 11, color: brand.textDim },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: brand.accent + "18",
    borderWidth: 1,
    borderColor: brand.accent + "40",
  },
  sportBadgeText: { fontSize: 9, fontWeight: "700", color: brand.accent, letterSpacing: 1 },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: brand.border,
  },
  roleBadgeOwner: { backgroundColor: brand.accent + "30" },
  roleBadgeText: { fontSize: 9, fontWeight: "700", color: brand.textMuted, letterSpacing: 1 },
  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: brand.accent,
    minWidth: 60,
    alignItems: "center",
  },
  joinBtnText: { fontSize: 10, fontWeight: "700", color: brand.bg, letterSpacing: 1 },
  empty: { alignItems: "center", padding: 48, gap: 12 },
  emptyText: { fontSize: 15, color: brand.textMuted },
  discoverBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: brand.accent,
  },
  discoverBtnText: { fontSize: 11, fontWeight: "700", color: brand.accent, letterSpacing: 2 },
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
