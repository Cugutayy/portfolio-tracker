import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API, type Badge } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatPace } from "@/lib/format";

export default function ProfileScreen() {
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [stats, setStats] = useState<{
    totalRuns: number;
    totalDistanceKm: number;
    avgPaceSecKm: number;
    stravaConnected: boolean;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [badges, setBadges] = useState<Array<{ badge: Badge; earnedAt: string }>>([]);
  const [inviting, setInviting] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<{ totalRuns: number; totalDistanceM: number; totalTimeSec: number; avgPaceSecKm: number | null; distanceChange: number | null } | null>(null);
  const [onboardingPercent, setOnboardingPercent] = useState(0);
  const [role, setRole] = useState<string>("member");

  const loadProfile = useCallback(async () => {
    try {
      const cached = await getUser();
      if (cached) setUser(cached);

      const profile = await API.getProfile() as {
        member?: { id: string; name: string; email: string; role?: string };
        id?: string; name?: string; email?: string; role?: string;
        stravaConnected?: boolean;
        stats?: { totalRuns?: number; totalDistanceM?: number; avgPaceSecKm?: number };
        followerCount?: number;
        followingCount?: number;
        weeklyStats?: { totalRuns: number; totalDistanceM: number; totalTimeSec: number; avgPaceSecKm: number | null; distanceChange: number | null };
      };
      const m = profile.member || profile;
      if (m.id && m.name && m.email) {
        setUser({ id: m.id, name: m.name, email: m.email });
      }
      if (profile.member?.role || profile.role) setRole((profile.member?.role || profile.role) as string);
      const st = profile.stats;
      setStats({
        totalRuns: st?.totalRuns || 0,
        totalDistanceKm: st?.totalDistanceM ? st.totalDistanceM / 1000 : 0,
        avgPaceSecKm: st?.avgPaceSecKm || 0,
        stravaConnected: profile.stravaConnected || false,
      });
      setFollowerCount(profile.followerCount || 0);
      setFollowingCount(profile.followingCount || 0);
      if (profile.weeklyStats) setWeeklyStats(profile.weeklyStats);

      const onboarding = await API.getOnboardingProgress().catch(() => null);
      if (onboarding) setOnboardingPercent(onboarding.completionPercent || 0);
    } catch {
      const cached = await getUser();
      if (cached) setUser(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBadges = useCallback(async () => {
    try {
      const res = await API.getMyBadges();
      setBadges(res.badges);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadBadges();
    }, [loadProfile, loadBadges])
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await API.syncStrava();
      Alert.alert("Basarili", `${(result as { synced: number }).synced} yeni kosu senkronize edildi.`);
    } catch {
      Alert.alert("Hata", "Strava senkronizasyonu basarisiz.");
    } finally {
      setSyncing(false);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      const res = await API.createInvite();
      await Share.share({
        message: `Rota'ya katil! ${res.webLink}`,
        url: res.webLink,
      });
    } catch {
      Alert.alert("Hata", "Davet linki olusturulamadi.");
    } finally {
      setInviting(false);
    }
  };

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

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
      <ScrollView contentContainerStyle={s.content}>
        {/* Header with Settings */}
        <View style={s.topBar}>
          <View style={{ width: 40 }} />
          <Text style={s.topBarTitle}>PROFIL</Text>
          <TouchableOpacity onPress={() => router.push("/settings")} hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color={brand.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Avatar + Name */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{user?.name || "Kullanici"}</Text>
          <Text style={s.email}>{user?.email || ""}</Text>
          <TouchableOpacity style={s.editProfileBtn} onPress={() => router.push("/edit-profile")}>
            <Ionicons name="create-outline" size={14} color={brand.accent} />
            <Text style={s.editProfileText}>PROFILI DUZENLE</Text>
          </TouchableOpacity>
        </View>

        {/* Followers / Following */}
        <View style={s.followRow}>
          <TouchableOpacity style={s.followBadge} onPress={() => user && router.push(`/followers?memberId=${user.id}&type=followers`)}>
            <Text style={s.followCount}>{followerCount}</Text>
            <Text style={s.followLabel}>TAKIPCI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.followBadge} onPress={() => user && router.push(`/followers?memberId=${user.id}&type=following`)}>
            <Text style={s.followCount}>{followingCount}</Text>
            <Text style={s.followLabel}>TAKIP</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Summary */}
        {weeklyStats && (
          <View style={s.weeklyCard}>
            <Text style={s.weeklyTitle}>BU HAFTA</Text>
            <Text style={s.weeklyStats}>
              {weeklyStats.totalRuns} kosu · {(weeklyStats.totalDistanceM / 1000).toFixed(1)} km
              {weeklyStats.avgPaceSecKm ? ` · ${formatPace(weeklyStats.avgPaceSecKm)} tempo` : ""}
            </Text>
            {weeklyStats.distanceChange !== null && weeklyStats.distanceChange !== undefined && (
              <Text style={[s.weeklyChange, { color: weeklyStats.distanceChange >= 0 ? "#4CAF50" : "#FF5252" }]}>
                {weeklyStats.distanceChange >= 0 ? "\u2191" : "\u2193"} {Math.abs(weeklyStats.distanceChange)}% gecen haftaya gore
              </Text>
            )}
            {weeklyStats.totalRuns === 0 && (
              <Text style={s.weeklyEmpty}>Bu hafta henuz kosu yok. Hadi baslayalim!</Text>
            )}
          </View>
        )}

        {/* Onboarding progress narrative */}
        <View style={s.onboardingCard}>
          <View style={s.onboardingHeader}>
            <Text style={s.onboardingTitle}>AKTIVASYON iLERLEMEN</Text>
            <Text style={s.onboardingPercent}>{onboardingPercent}%</Text>
          </View>
          <View style={s.onboardingTrack}>
            <View style={[s.onboardingFill, { width: `${Math.max(4, onboardingPercent)}%` }]} />
          </View>
          <TouchableOpacity style={s.onboardingBtn} onPress={() => router.push("/onboarding") }>
            <Text style={s.onboardingBtnText}>ONBOARDING ADIMLARINI GOR</Text>
          </TouchableOpacity>
        </View>

        {/* Company/Club admin quick access */}
        {role === "admin" && (
          <TouchableOpacity style={s.adminButton} onPress={() => router.push("/club-admin") }>
            <Ionicons name="business-outline" size={18} color={brand.accent} />
            <Text style={s.adminButtonText}>CLUB / COMPANY ADMIN</Text>
            <Ionicons name="chevron-forward" size={16} color={brand.textDim} />
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{stats?.totalRuns || 0}</Text>
            <Text style={s.statLabel}>KOSU</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{stats?.totalDistanceKm || 0}</Text>
            <Text style={s.statLabel}>KM</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{formatPace(stats?.avgPaceSecKm || 0)}</Text>
            <Text style={s.statLabel}>ORT. TEMPO</Text>
          </View>
        </View>

        {/* Invite Button */}
        <TouchableOpacity style={s.inviteButton} onPress={handleInvite} disabled={inviting}>
          <Ionicons name="person-add-outline" size={18} color={brand.bg} />
          <Text style={s.inviteButtonText}>
            {inviting ? "HAZIRLANIYOR..." : "DAVET ET"}
          </Text>
        </TouchableOpacity>

        {/* Badges Section */}
        {badges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ROZETLER</Text>
            <View style={s.badgesGrid}>
              {badges.map(({ badge }) => (
                <View key={badge.id} style={s.badgeItem}>
                  <Text style={s.badgeEmoji}>{badge.iconEmoji}</Text>
                  <Text style={s.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Health Data Import */}
        <TouchableOpacity
          style={s.healthButton}
          onPress={() => router.push("/import-activity")}
        >
          <Ionicons name="heart-outline" size={18} color={brand.accent} />
          <Text style={s.healthButtonText}>SAGLIK VERiLERiNi iCE AKTAR</Text>
          <Ionicons name="chevron-forward" size={16} color={brand.textDim} />
        </TouchableOpacity>

        {/* Strava Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>STRAVA</Text>
          {stats?.stravaConnected ? (
            <>
              <View style={s.stravaConnected}>
                <View style={[s.statusDot, { backgroundColor: "#4ade80" }]} />
                <Text style={s.stravaText}>Strava bagli</Text>
              </View>
              <TouchableOpacity
                style={s.syncButton}
                onPress={handleSync}
                disabled={syncing}
              >
                <Text style={s.syncButtonText}>
                  {syncing ? "SENKRONiZE EDiLiYOR..." : "STRAVA SYNC"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={s.stravaButton}
              onPress={async () => {
                try {
                  const { url } = await API.getStravaAuthUrl();
                  await WebBrowser.openAuthSessionAsync(url, "rota://strava-callback");
                  loadProfile();
                } catch {
                  Alert.alert("Hata", "Strava baglantisi baslatilamadi.");
                }
              }}
            >
              <Text style={s.stravaButtonText}>STRAVA BAGLA</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings shortcut — logout moved to settings */}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24 },
  topBar: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, paddingTop: 8, marginBottom: -16 },
  topBarTitle: { fontSize: 13, fontWeight: "bold" as const, color: brand.text, letterSpacing: 3 },
  profileHeader: { alignItems: "center", paddingVertical: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: brand.surface, borderWidth: 2, borderColor: brand.accent, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  avatarText: { fontSize: 24, fontWeight: "bold", color: brand.accent },
  name: { fontSize: 20, fontWeight: "bold", color: brand.text, letterSpacing: 2 },
  email: { fontSize: 13, color: brand.textDim, marginTop: 4 },
  editProfileBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 12, borderWidth: 1, borderColor: brand.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 8 },
  editProfileText: { fontSize: 11, fontWeight: "600" as const, color: brand.accent, letterSpacing: 2 },

  // Followers
  followRow: { flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 24 },
  followBadge: { alignItems: "center", backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 20 },
  followCount: { fontSize: 18, fontWeight: "bold", color: brand.text },
  followLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 2 },

  weeklyCard: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 8, padding: 16, marginBottom: 16, alignItems: "center" as const },
  weeklyTitle: { fontSize: 11, fontWeight: "bold" as const, color: brand.textDim, letterSpacing: 3, marginBottom: 8 },
  weeklyStats: { fontSize: 14, color: brand.text, marginBottom: 4 },
  weeklyChange: { fontSize: 12, fontWeight: "600" as const },
  weeklyEmpty: { fontSize: 12, color: brand.textMuted, fontStyle: "italic" as const },

  onboardingCard: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 8, padding: 14, marginBottom: 16 },
  onboardingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  onboardingTitle: { color: brand.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  onboardingPercent: { color: brand.accent, fontSize: 18, fontWeight: "900" },
  onboardingTrack: { height: 8, borderRadius: 4, backgroundColor: "#2A2A2F", overflow: "hidden", marginBottom: 10 },
  onboardingFill: { height: 8, borderRadius: 4, backgroundColor: brand.accent },
  onboardingBtn: { alignItems: "center", justifyContent: "center", height: 36, borderWidth: 1, borderColor: brand.accent, borderRadius: 6 },
  onboardingBtnText: { color: brand.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },

  adminButton: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 14, marginBottom: 16 },
  adminButtonText: { flex: 1, fontSize: 12, fontWeight: "700", color: brand.text, letterSpacing: 1.2 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, padding: 16, borderRadius: 4, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },

  // Invite
  inviteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: brand.accent, paddingVertical: 14, borderRadius: 4, marginBottom: 16 },
  inviteButtonText: { fontSize: 12, fontWeight: "700", color: brand.bg, letterSpacing: 2 },

  // Badges
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badgeItem: { alignItems: "center", width: 72 },
  badgeEmoji: { fontSize: 28 },
  badgeName: { fontSize: 10, color: brand.textDim, textAlign: "center", marginTop: 4 },

  section: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: brand.textMuted, letterSpacing: 3, fontWeight: "600", marginBottom: 12 },
  stravaConnected: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  stravaText: { fontSize: 13, color: brand.text },
  syncButton: { backgroundColor: brand.strava, paddingVertical: 12, borderRadius: 4, alignItems: "center" },
  syncButtonText: { fontSize: 12, fontWeight: "700", color: "#fff", letterSpacing: 2 },
  stravaButton: { backgroundColor: brand.strava, paddingVertical: 14, borderRadius: 4, alignItems: "center" },
  stravaButtonText: { fontSize: 12, fontWeight: "700", color: "#fff", letterSpacing: 2 },
  healthButton: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 14, marginBottom: 16 },
  healthButtonText: { flex: 1, fontSize: 12, fontWeight: "600", color: brand.text, letterSpacing: 1 },
});
