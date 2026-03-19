import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API, type MemberProfile, type CommunityActivity } from "@/lib/api";
import { formatDistance, formatPace, formatDate } from "@/lib/format";

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [profileRes, activitiesRes] = await Promise.allSettled([
        API.getMemberProfile(id),
        API.getCommunityActivities({ runner: id, limit: "10" }),
      ]);
      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value);
      } else {
        setError("Profil yuklenemedi");
      }
      if (activitiesRes.status === "fulfilled") {
        setActivities(activitiesRes.value.activities);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Profil yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFollow = useCallback(async () => {
    if (!id || !profile) return;
    setFollowLoading(true);
    // Optimistic update
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isFollowing: !prev.isFollowing,
        followerCount: prev.followerCount + (prev.isFollowing ? -1 : 1),
      };
    });
    try {
      await API.toggleFollow(id);
    } catch {
      // Revert
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          isFollowing: !prev.isFollowing,
          followerCount: prev.followerCount + (prev.isFollowing ? -1 : 1),
        };
      });
    } finally {
      setFollowLoading(false);
    }
  }, [id, profile]);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator color={brand.accent} size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.errorText}>{error || "Profil bulunamadi"}</Text>
      </View>
    );
  }

  const { member, stats } = profile;
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Avatar + Name */}
      <View style={s.profileHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{member.name}</Text>
        {member.bio && <Text style={s.bio}>{member.bio}</Text>}
        {member.paceGroup && (
          <View style={s.paceGroupBadge}>
            <Text style={s.paceGroupText}>{member.paceGroup}</Text>
          </View>
        )}
      </View>

      {/* Follow button */}
      <TouchableOpacity
        style={[s.followButton, profile.isFollowing && s.followButtonActive]}
        onPress={handleFollow}
        disabled={followLoading}
      >
        <Text style={[s.followButtonText, profile.isFollowing && s.followButtonTextActive]}>
          {profile.isFollowing ? "TAKIP EDILIYOR" : "TAKIP ET"}
        </Text>
      </TouchableOpacity>

      {/* Followers / Following */}
      <View style={s.followRow}>
        <View style={s.followBadge}>
          <Text style={s.followCount}>{profile.followerCount}</Text>
          <Text style={s.followLabel}>TAKIPCI</Text>
        </View>
        <View style={s.followBadge}>
          <Text style={s.followCount}>{profile.followingCount}</Text>
          <Text style={s.followLabel}>TAKIP</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statValue}>{stats.totalRuns}</Text>
          <Text style={s.statLabel}>KOSU</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{(stats.totalDistanceM / 1000).toFixed(0)}</Text>
          <Text style={s.statLabel}>KM</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{formatPace(stats.avgPace)}</Text>
          <Text style={s.statLabel}>ORT. TEMPO</Text>
        </View>
      </View>

      {/* Recent Activities */}
      {activities.length > 0 && (
        <View style={s.activitiesSection}>
          <Text style={s.sectionTitle}>SON KOSULARI</Text>
          {activities.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.activityCard}
              onPress={() => router.push(`/activity/${item.id}` as never)}
              activeOpacity={0.7}
            >
              <Text style={s.activityTitle}>{item.title}</Text>
              <Text style={s.activityDate}>{formatDate(item.startTime)}</Text>
              <View style={s.activityStats}>
                <Text style={s.activityStat}>
                  <Text style={s.activityStatValue}>{formatDistance(item.distanceM)}</Text> km
                </Text>
                <Text style={s.activityStat}>
                  <Text style={s.activityStatValue}>{formatPace(item.avgPaceSecKm)}</Text> /km
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  content: { padding: 24, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brand.bg },
  errorText: { color: brand.textMuted, fontSize: 15 },

  // Profile header
  profileHeader: { alignItems: "center", paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: brand.surface, borderWidth: 2, borderColor: brand.accent, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  avatarText: { fontSize: 24, fontWeight: "bold", color: brand.accent },
  name: { fontSize: 20, fontWeight: "bold", color: brand.text, letterSpacing: 2 },
  bio: { fontSize: 13, color: brand.textMuted, marginTop: 8, textAlign: "center", paddingHorizontal: 20 },
  paceGroupBadge: { marginTop: 8, backgroundColor: brand.elevated, borderWidth: 1, borderColor: brand.border, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  paceGroupText: { fontSize: 11, color: brand.accent, fontWeight: "600", letterSpacing: 2 },

  // Follow
  followButton: { borderWidth: 1, borderColor: brand.accent, paddingVertical: 12, borderRadius: 4, alignItems: "center", marginBottom: 16 },
  followButtonActive: { backgroundColor: brand.accent },
  followButtonText: { fontSize: 12, fontWeight: "700", color: brand.accent, letterSpacing: 2 },
  followButtonTextActive: { color: brand.bg },
  followRow: { flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 24 },
  followBadge: { alignItems: "center", backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 20 },
  followCount: { fontSize: 18, fontWeight: "bold", color: brand.text },
  followLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, padding: 16, borderRadius: 4, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },

  // Activities
  activitiesSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: brand.textMuted, letterSpacing: 3, fontWeight: "600", marginBottom: 12 },
  activityCard: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, marginBottom: 8 },
  activityTitle: { fontSize: 14, color: brand.text, fontWeight: "600", marginBottom: 4 },
  activityDate: { fontSize: 11, color: brand.textDim, marginBottom: 8 },
  activityStats: { flexDirection: "row", gap: 16 },
  activityStat: { fontSize: 12, color: brand.textMuted },
  activityStatValue: { color: brand.accent, fontWeight: "600" },
});
