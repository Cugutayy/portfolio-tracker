import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  eventType: string;
  date: string;
  meetingPoint: string | null;
  distanceM: number | null;
  maxParticipants: number | null;
  coverImageUrl: string | null;
  status: string;
  rsvpCount?: number;
  isGoing?: boolean;
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const data = (await API.getEvents()) as { events: Event[] };
      setEvents(data.events || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  const handleRsvp = async (slug: string) => {
    setRsvpLoading(slug);
    try {
      await API.rsvpEvent(slug);
      // Toggle local state
      setEvents((prev) =>
        prev.map((e) =>
          e.slug === slug
            ? {
                ...e,
                isGoing: !e.isGoing,
                rsvpCount: (e.rsvpCount || 0) + (e.isGoing ? -1 : 1),
              }
            : e,
        ),
      );
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "RSVP yapilamadi");
    } finally {
      setRsvpLoading(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const months = [
      "OCA", "SUB", "MAR", "NIS", "MAY", "HAZ",
      "TEM", "AGU", "EYL", "EKI", "KAS", "ARA",
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/event/${item.slug}` as never)}
    >
      <View style={s.cardDate}>
        <Text style={s.dateDay}>{new Date(item.date).getDate()}</Text>
        <Text style={s.dateMonth}>
          {formatDate(item.date).split(" ")[1]}
        </Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardTitle}>{item.title}</Text>
        <View style={s.cardMeta}>
          {item.meetingPoint && (
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={12} color={brand.textDim} />
              <Text style={s.metaText}>{item.meetingPoint}</Text>
            </View>
          )}
          <View style={s.metaItem}>
            <Ionicons name="time-outline" size={12} color={brand.textDim} />
            <Text style={s.metaText}>{formatTime(item.date)}</Text>
          </View>
          {item.distanceM && (
            <View style={s.metaItem}>
              <Ionicons name="resize-outline" size={12} color={brand.textDim} />
              <Text style={s.metaText}>
                {(item.distanceM / 1000).toFixed(0)} km
              </Text>
            </View>
          )}
        </View>
        <View style={s.cardFooter}>
          <Text style={s.rsvpCount}>
            {item.rsvpCount || 0} katilimci
          </Text>
          <TouchableOpacity
            style={[s.rsvpBtn, item.isGoing && s.rsvpBtnActive]}
            onPress={() => handleRsvp(item.slug)}
            disabled={rsvpLoading === item.slug}
          >
            {rsvpLoading === item.slug ? (
              <ActivityIndicator color={brand.bg} size="small" />
            ) : (
              <Text
                style={[s.rsvpText, item.isGoing && s.rsvpTextActive]}
              >
                {item.isGoing ? "KATILIYORUM ✓" : "KATIL"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>ETKİNLİKLER</Text>
            <Text style={s.subtitle}>Yaklasan kosular ve bulusmalar</Text>
          </View>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => router.push("/create-event")}
          >
            <Ionicons name="add" size={20} color={brand.bg} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchEvents();
            }}
            tintColor={brand.accent}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={48} color={brand.textDim} />
            <Text style={s.emptyText}>Yaklasan etkinlik yok</Text>
            <Text style={s.emptySubtext}>
              Yeni etkinlikler eklendiginde burada gorunecek
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "bold", color: brand.text, letterSpacing: 4 },
  subtitle: { fontSize: 12, color: brand.textDim, letterSpacing: 1, marginTop: 2 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardDate: {
    width: 60,
    backgroundColor: brand.elevated,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  dateDay: { fontSize: 22, fontWeight: "bold", color: brand.accent },
  dateMonth: { fontSize: 10, color: brand.textMuted, letterSpacing: 2, marginTop: 2 },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: brand.text, letterSpacing: 1, marginBottom: 6 },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: brand.textDim },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rsvpCount: { fontSize: 11, color: brand.textMuted },
  rsvpBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: brand.accent,
  },
  rsvpBtnActive: {
    backgroundColor: brand.accent,
  },
  rsvpText: { fontSize: 10, fontWeight: "700", color: brand.accent, letterSpacing: 1 },
  rsvpTextActive: { color: brand.bg },
  empty: { alignItems: "center", padding: 48, gap: 12 },
  emptyText: { fontSize: 16, color: brand.textMuted, fontWeight: "600" },
  emptySubtext: { fontSize: 12, color: brand.textDim, textAlign: "center" },
});
