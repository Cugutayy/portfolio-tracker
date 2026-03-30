import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, ScrollView, Image, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import { formatRelativeTime, formatDate, getInitials } from "@/lib/format";
import { CATEGORIES, CATEGORY_MAP, eventTypeToCategory, type EventCategory } from "@/constants/categories";

interface EventItem {
  id: string;
  slug: string;
  title: string;
  category?: EventCategory;
  eventType?: string;
  date: string;
  meetingPoint?: string;
  attendeeCount?: number;
  rsvpCount?: number;
  maxParticipants?: number;
  creatorName?: string;
  creatorImage?: string | null;
  isGoing?: boolean;
}

interface GroupItem {
  id: string;
  slug: string;
  name: string;
  memberCount: number;
  image?: string | null;
  sportType?: string;
  city?: string;
}

export default function DiscoverScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [evRes, grRes] = await Promise.allSettled([
        API.getEvents(),
        API.getGroups({}),
      ]);
      if (evRes.status === "fulfilled") setEvents((evRes.value as any).events || []);
      if (grRes.status === "fulfilled") setGroups((grRes.value as any).groups || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const filteredEvents = selectedCategory
    ? events.filter((e) => {
        const cat = (e.category as EventCategory) || eventTypeToCategory(e.eventType);
        return cat === selectedCategory;
      })
    : events;

  const handleRSVP = async (slug: string) => {
    try {
      await API.toggleRSVP(slug);
      fetchData();
    } catch {}
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>KESFET</Text>
        <TouchableOpacity onPress={() => router.push("/search" as never)}>
          <Ionicons name="search-outline" size={22} color={brand.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={brand.accent} />}
        ListHeaderComponent={
          <>
            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={s.chipsContent}>
              <TouchableOpacity
                style={[s.chip, !selectedCategory && s.chipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[s.chipText, !selectedCategory && s.chipTextActive]}>Tumu</Text>
              </TouchableOpacity>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[s.chip, selectedCategory === c.key && { borderColor: c.color, backgroundColor: c.color + "15" }]}
                  onPress={() => setSelectedCategory(selectedCategory === c.key ? null : c.key)}
                >
                  <Ionicons name={c.icon as any} size={14} color={selectedCategory === c.key ? c.color : brand.textMuted} />
                  <Text style={[s.chipText, selectedCategory === c.key && { color: c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Popular Groups */}
            {groups.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>POPULER GRUPLAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                  {groups.slice(0, 8).map((g) => (
                    <TouchableOpacity key={g.id} style={s.groupCard} onPress={() => router.push(`/group/${g.slug}` as never)} activeOpacity={0.7}>
                      {g.image ? (
                        <Image source={{ uri: g.image }} style={s.groupImg} />
                      ) : (
                        <View style={s.groupImgPlaceholder}>
                          <Text style={s.groupInitials}>{getInitials(g.name)}</Text>
                        </View>
                      )}
                      <Text style={s.groupName} numberOfLines={1}>{g.name}</Text>
                      <Text style={s.groupMeta}>{g.memberCount} uye</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Events header */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>YAKLASAN ETKINLIKLER</Text>
              <Text style={s.sectionCount}>{filteredEvents.length}</Text>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const catKey = (item.category as EventCategory) || eventTypeToCategory(item.eventType);
          const cat = CATEGORY_MAP[catKey] || CATEGORY_MAP.diger;
          const count = item.attendeeCount ?? item.rsvpCount ?? 0;
          return (
            <TouchableOpacity style={s.eventCard} onPress={() => router.push(`/event/${item.slug}` as never)} activeOpacity={0.7}>
              <View style={[s.eventCatDot, { backgroundColor: cat.color + "20" }]}>
                <Ionicons name={cat.icon as any} size={22} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.eventTitle}>{item.title}</Text>
                <View style={s.eventMeta}>
                  <Ionicons name="calendar-outline" size={12} color={brand.textDim} />
                  <Text style={s.eventMetaText}>{formatDate(item.date)}</Text>
                  {item.meetingPoint && (
                    <>
                      <Ionicons name="location-outline" size={12} color={brand.textDim} />
                      <Text style={s.eventMetaText} numberOfLines={1}>{item.meetingPoint}</Text>
                    </>
                  )}
                </View>
                <View style={s.eventBottom}>
                  <Text style={s.eventAttendees}>{count} katilimci</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.joinBtn, item.isGoing && s.joinBtnActive]}
                onPress={() => handleRSVP(item.slug)}
              >
                <Text style={[s.joinText, item.isGoing && s.joinTextActive]}>
                  {item.isGoing ? "KATILDIM" : "KATIL"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={brand.accent} style={{ marginTop: 40 }} /> : (
            <View style={s.empty}>
              <Ionicons name="compass-outline" size={48} color={brand.textDim} />
              <Text style={s.emptyTitle}>Yaklasan etkinlik yok</Text>
              <Text style={s.emptyDesc}>Ilk etkinligi sen olustur!</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/create-event" as never)}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={s.emptyBtnText}>Etkinlik Olustur</Text>
              </TouchableOpacity>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: brand.border,
  },
  title: { fontSize: 16, fontWeight: "700", color: brand.text, letterSpacing: 3 },

  chips: { marginTop: 12, marginBottom: 4 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: brand.border, backgroundColor: brand.surface,
  },
  chipActive: { borderColor: brand.accent, backgroundColor: brand.accentDim },
  chipText: { fontSize: 12, fontWeight: "600", color: brand.textMuted },
  chipTextActive: { color: brand.accent },

  section: { marginTop: 20, marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginTop: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: brand.textDim, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10 },
  sectionCount: { fontSize: 12, color: brand.textMuted, paddingRight: 16 },

  groupCard: { width: 100, alignItems: "center", gap: 6 },
  groupImg: { width: 64, height: 64, borderRadius: 32 },
  groupImgPlaceholder: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: brand.surface,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.border,
  },
  groupInitials: { fontSize: 18, fontWeight: "700", color: brand.accent },
  groupName: { fontSize: 12, fontWeight: "600", color: brand.text, textAlign: "center" },
  groupMeta: { fontSize: 10, color: brand.textDim },

  eventCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    backgroundColor: brand.surface, borderRadius: 14,
    borderWidth: 1, borderColor: brand.border,
  },
  eventCatDot: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  eventTitle: { fontSize: 15, fontWeight: "700", color: brand.text, marginBottom: 4 },
  eventMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  eventMetaText: { fontSize: 11, color: brand.textDim, maxWidth: 120 },
  eventBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventAttendees: { fontSize: 11, color: brand.textMuted },
  joinBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: brand.accent,
  },
  joinBtnActive: { backgroundColor: brand.accent },
  joinText: { fontSize: 11, fontWeight: "700", color: brand.accent, letterSpacing: 1 },
  joinTextActive: { color: "#FFF" },

  empty: { alignItems: "center", padding: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: brand.text },
  emptyDesc: { fontSize: 13, color: brand.textDim },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8,
    backgroundColor: brand.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
});
