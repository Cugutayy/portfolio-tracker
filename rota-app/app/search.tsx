import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API, type Group } from "@/lib/api";
import { getInitials } from "@/lib/format";

type SearchTab = "all" | "members" | "groups" | "events";

const TABS: { key: SearchTab; label: string }[] = [
  { key: "all", label: "TUMU" },
  { key: "members", label: "UYELER" },
  { key: "groups", label: "GRUPLAR" },
  { key: "events", label: "ETKINLIKLER" },
];

interface SearchResults {
  members: Array<{ id: string; name: string; image: string | null }>;
  groups: Group[];
  events: Array<{ id: string; title: string; slug: string; date: string }>;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [results, setResults] = useState<SearchResults>({ members: [], groups: [], events: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, type?: string) => {
    if (q.trim().length < 2) {
      setResults({ members: [], groups: [], events: [] });
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await API.search(q, type === "all" ? undefined : type);
      setResults({
        members: res.members || [],
        groups: res.groups || [],
        events: res.events || [],
      });
      setSearched(true);
    } catch {
      setSearched(true);
    }
    setLoading(false);
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(text, activeTab);
    }, 300);
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    if (query.trim().length >= 2) {
      doSearch(query, tab);
    }
  };

  // getInitials imported from @/lib/format

  // Combine results for "all" tab
  type ResultItem =
    | { type: "member"; data: { id: string; name: string; image: string | null } }
    | { type: "group"; data: Group }
    | { type: "event"; data: { id: string; title: string; slug: string; date: string } };

  const getItems = (): ResultItem[] => {
    if (activeTab === "members") return results.members.map((m) => ({ type: "member" as const, data: m }));
    if (activeTab === "groups") return results.groups.map((g) => ({ type: "group" as const, data: g }));
    if (activeTab === "events") return results.events.map((e) => ({ type: "event" as const, data: e }));
    // all
    return [
      ...results.members.map((m): ResultItem => ({ type: "member", data: m })),
      ...results.groups.map((g): ResultItem => ({ type: "group", data: g })),
      ...results.events.map((e): ResultItem => ({ type: "event", data: e })),
    ];
  };

  const renderItem = ({ item }: { item: ResultItem }) => {
    if (item.type === "member") {
      const m = item.data;
      return (
        <TouchableOpacity
          style={s.resultRow}
          activeOpacity={0.7}
          onPress={() => router.push(`/member/${m.id}` as never)}
        >
          <View style={s.avatar}>
            {m.image ? (
              <Image source={{ uri: m.image }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarText}>{getInitials(m.name)}</Text>
            )}
          </View>
          <View style={s.resultInfo}>
            <Text style={s.resultName}>{m.name}</Text>
            <Text style={s.resultType}>Uye</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={brand.textDim} />
        </TouchableOpacity>
      );
    }
    if (item.type === "group") {
      const g = item.data;
      return (
        <TouchableOpacity
          style={s.resultRow}
          activeOpacity={0.7}
          onPress={() => router.push(`/group/${g.slug}` as never)}
        >
          <View style={s.avatar}>
            {g.image ? (
              <Image source={{ uri: g.image }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarText}>{getInitials(g.name)}</Text>
            )}
          </View>
          <View style={s.resultInfo}>
            <Text style={s.resultName}>{g.name}</Text>
            <Text style={s.resultType}>{g.memberCount} uye</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={brand.textDim} />
        </TouchableOpacity>
      );
    }
    // event
    const e = item.data;
    return (
      <TouchableOpacity
        style={s.resultRow}
        activeOpacity={0.7}
        onPress={() => router.push(`/event/${e.slug}` as never)}
      >
        <View style={[s.avatar, s.eventAvatar]}>
          <Ionicons name="calendar-outline" size={18} color={brand.accent} />
        </View>
        <View style={s.resultInfo}>
          <Text style={s.resultName}>{e.title}</Text>
          <Text style={s.resultType}>
            {new Date(e.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={brand.textDim} />
      </TouchableOpacity>
    );
  };

  const items = getItems();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={brand.text} />
        </TouchableOpacity>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={brand.textDim} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Ara..."
            placeholderTextColor={brand.textDim}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setResults({ members: [], groups: [], events: [] }); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={brand.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segment tabs */}
      <View style={s.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centerContainer}>
          <ActivityIndicator color={brand.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${item.type === "member" ? item.data.id : item.type === "group" ? (item.data as Group).slug : (item.data as any).id}-${index}`}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.centerContainer}>
              <Text style={s.emptyText}>
                {!searched
                  ? "Arama icin bir seyler yazin"
                  : query.trim().length < 2
                    ? "En az 2 karakter girin"
                    : "Sonuc bulunamadi"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: brand.text, paddingVertical: 10 },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  tabActive: { borderColor: brand.accent, backgroundColor: "rgba(230,255,0,0.1)" },
  tabText: { fontSize: 10, fontWeight: "600", color: brand.textMuted, letterSpacing: 1 },
  tabTextActive: { color: brand.accent },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 6,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { fontSize: 13, fontWeight: "bold", color: brand.accent },
  eventAvatar: { backgroundColor: brand.accent + "18" },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: "600", color: brand.text },
  resultType: { fontSize: 11, color: brand.textDim, marginTop: 2 },
  emptyText: { fontSize: 14, color: brand.textMuted },
});
