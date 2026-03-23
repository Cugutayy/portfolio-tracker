import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

interface EventDetail {
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
  rsvpCount: number;
  isGoing: boolean;
}

interface Rsvp {
  id: string;
  memberName: string;
  memberImage: string | null;
  memberId?: string;
  paceGroup: string | null;
  status: string;
}

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await API.getEventDetail(slug);
      setEvent(data.event);
      setRsvps((data.rsvps || []).filter((r) => r.status === "going"));
    } catch (err: unknown) {
      setError((err as Error).message || "Etkinlik yuklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRsvp = async () => {
    if (!slug || !event) return;
    setRsvpLoading(true);
    try {
      await API.rsvpEvent(slug);
      // Reload to get fresh data
      await loadData();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "RSVP yapilamadi");
    } finally {
      setRsvpLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const days = ["Pazar", "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi"];
    const months = [
      "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
      "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getEventTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      group_run: "Grup Kosusu",
      race: "Yaris",
      social: "Sosyal",
      training: "Antrenman",
      other: "Diger",
    };
    return map[type] || type;
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Geri",
            headerTintColor: brand.accent,
            headerStyle: { backgroundColor: brand.bg },
          }}
        />
        <ActivityIndicator color={brand.accent} size="large" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={s.loadingContainer}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Geri",
            headerTintColor: brand.accent,
            headerStyle: { backgroundColor: brand.bg },
          }}
        />
        <Text style={s.errorText}>{error || "Etkinlik bulunamadi"}</Text>
      </View>
    );
  }

  const goingCount = rsvps.length;

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: event.title,
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
          headerTitleStyle: { color: brand.text, fontSize: 15, fontWeight: "700", letterSpacing: 1 },
        }}
      />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={brand.accent}
          />
        }
      >
        {/* Event Info Card */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={brand.accent} />
            <Text style={s.infoText}>{formatDate(event.date)}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="time-outline" size={16} color={brand.accent} />
            <Text style={s.infoText}>{formatTime(event.date)}</Text>
          </View>
          {event.meetingPoint && (
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={16} color={brand.accent} />
              <Text style={s.infoText}>{event.meetingPoint}</Text>
            </View>
          )}
          {event.distanceM && (
            <View style={s.infoRow}>
              <Ionicons name="resize-outline" size={16} color={brand.accent} />
              <Text style={s.infoText}>{(event.distanceM / 1000).toFixed(1)} km</Text>
            </View>
          )}
          <View style={s.infoRow}>
            <Ionicons name="flag-outline" size={16} color={brand.accent} />
            <Text style={s.infoText}>{getEventTypeLabel(event.eventType)}</Text>
          </View>
        </View>

        {/* Participant Count + RSVP */}
        <View style={s.rsvpSection}>
          <View style={s.rsvpInfo}>
            <Ionicons name="people-outline" size={18} color={brand.textMuted} />
            <Text style={s.participantCount}>
              {goingCount}
              {event.maxParticipants ? `/${event.maxParticipants}` : ""} katilimci
            </Text>
          </View>
          <TouchableOpacity
            style={[s.rsvpBtn, event.isGoing && s.rsvpBtnActive]}
            onPress={handleRsvp}
            disabled={rsvpLoading}
          >
            {rsvpLoading ? (
              <ActivityIndicator color={event.isGoing ? brand.bg : brand.accent} size="small" />
            ) : (
              <Text style={[s.rsvpText, event.isGoing && s.rsvpTextActive]}>
                {event.isGoing ? "KATILIYORSUN \u2713" : "KATIL"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Description */}
        {event.description && (
          <View style={s.descriptionSection}>
            <Text style={s.sectionTitle}>ACIKLAMA</Text>
            <Text style={s.descriptionText}>{event.description}</Text>
          </View>
        )}

        {/* Participants List */}
        {goingCount > 0 && (
          <View style={s.participantsSection}>
            <Text style={s.sectionTitle}>KATILIMCILAR</Text>
            {rsvps.map((rsvp) => (
              <TouchableOpacity
                key={rsvp.id}
                style={s.attendeeRow}
                onPress={() => {
                  if (rsvp.memberId) {
                    router.push(`/member/${rsvp.memberId}` as never);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={s.attendeeAvatarWrap}>
                  <View style={s.attendeeAvatar}>
                    {rsvp.memberImage ? (
                      <Image
                        source={{ uri: rsvp.memberImage }}
                        style={s.attendeeAvatarImage}
                      />
                    ) : (
                      <Text style={s.attendeeAvatarText}>
                        {getInitials(rsvp.memberName)}
                      </Text>
                    )}
                  </View>
                  <View style={s.onlineDot} />
                </View>
                <View style={s.attendeeInfo}>
                  <Text style={s.attendeeName}>{rsvp.memberName}</Text>
                  {rsvp.paceGroup && (
                    <Text style={s.attendeePace}>{rsvp.paceGroup}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={brand.textDim} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brand.bg },
  errorText: { color: brand.textMuted, fontSize: 15 },

  // Info Card
  infoCard: {
    margin: 16,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, color: brand.text },

  // RSVP Section
  rsvpSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    padding: 16,
  },
  rsvpInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  participantCount: { fontSize: 14, color: brand.textMuted, fontWeight: "600" },
  rsvpBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.accent,
  },
  rsvpBtnActive: {
    backgroundColor: brand.accent,
  },
  rsvpText: { fontSize: 12, fontWeight: "700", color: brand.accent, letterSpacing: 1 },
  rsvpTextActive: { color: brand.bg },

  // Description
  descriptionSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    color: brand.textMuted,
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 12,
  },
  descriptionText: { fontSize: 14, color: brand.text, lineHeight: 22 },

  // Participants
  participantsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    padding: 16,
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
    gap: 12,
  },
  attendeeAvatarWrap: { position: "relative" },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.elevated,
    borderWidth: 1,
    borderColor: brand.border,
    justifyContent: "center",
    alignItems: "center",
  },
  attendeeAvatarImage: { width: 38, height: 38, borderRadius: 19 },
  attendeeAvatarText: { fontSize: 13, fontWeight: "bold", color: brand.accent },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: brand.surface,
  },
  attendeeInfo: { flex: 1 },
  attendeeName: { fontSize: 14, fontWeight: "600", color: brand.text },
  attendeePace: { fontSize: 11, color: brand.textDim, marginTop: 2 },
});
