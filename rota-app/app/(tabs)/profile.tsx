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
  Image,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API, type Badge, type Member, type WeeklyGoalResponse, type PersonalRecord } from "@/lib/api";
import { getUser, setUser as cacheUser } from "@/lib/auth";
import { formatPace, formatDuration, formatDistance, formatDate } from "@/lib/format";

export default function ProfileScreen() {
  const [user, setUser] = useState<{ id: string; name: string; email: string; image?: string | null } | null>(null);
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
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalResponse | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [profileTab, setProfileTab] = useState<"progress" | "activities" | "achievements">("progress");
  const [myActivities, setMyActivities] = useState<Array<{ id: string; title: string; distanceM: number; movingTimeSec: number; startTime: string; avgPaceSecKm: number | null }>>([]);

  const loadProfile = useCallback(async () => {
    try {
      const cached = await getUser();
      if (cached) setUser(cached);

      const profile = await API.getProfile() as {
        member?: { id: string; name: string; email: string };
        id?: string; name?: string; email?: string;
        stravaConnected?: boolean;
        stats?: { totalRuns?: number; totalDistanceM?: number; avgPaceSecKm?: number };
        followerCount?: number;
        followingCount?: number;
        weeklyStats?: { totalRuns: number; totalDistanceM: number; totalTimeSec: number; avgPaceSecKm: number | null; distanceChange: number | null };
      };
      const m = profile.member || profile;
      if (m.id && m.name && m.email) {
        const userData = { id: m.id, name: m.name, email: m.email, image: (m as Member).image };
        setUser(userData);
        // Cache user with image for instant display on next visit
        cacheUser(userData);
      }
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

  const loadWeeklyGoal = useCallback(async () => {
    try {
      const res = await API.getWeeklyGoal();
      setWeeklyGoal(res);
    } catch {}
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      const res = await API.getMyRecords();
      setPersonalRecords(res.records || []);
    } catch {}
  }, []);

  const loadMyActivities = useCallback(async () => {
    try {
      const res = await API.getActivities(1, 20);
      setMyActivities((res.activities || []).map((a: any) => ({
        id: a.id, title: a.title, distanceM: a.distanceM, movingTimeSec: a.movingTimeSec,
        startTime: a.startTime, avgPaceSecKm: a.avgPaceSecKm,
      })));
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadBadges();
      loadWeeklyGoal();
      loadRecords();
      loadMyActivities();
    }, [loadProfile, loadBadges, loadWeeklyGoal, loadRecords, loadMyActivities])
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
            {user?.image ? (
              <Image source={{ uri: user.image }} style={s.avatarImage} />
            ) : (
              <Text style={s.avatarText}>{initials}</Text>
            )}
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

        {/* ── 3-Tab Bar (Strava: İlerleme/Egzersizler/Aktiviteler) ── */}
        <View style={s.profileTabs}>
          {([
            { key: "progress", label: "ILERLEME" },
            { key: "activities", label: "AKTIVITELER" },
            { key: "achievements", label: "BASARILAR" },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.profileTab, profileTab === t.key && s.profileTabActive]}
              onPress={() => setProfileTab(t.key)}
            >
              <Text style={[s.profileTabText, profileTab === t.key && s.profileTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ ILERLEME TAB ═══ */}
        {profileTab === "progress" && (
          <View>

        {/* Activation Milestones — shown until all complete */}
        {(() => {
          const milestones = [
            { key: "run", label: "Ilk kosunu tamamla", done: (stats?.totalRuns || 0) > 0, icon: "footsteps" as const },
            { key: "profile", label: "Profilini doldur", done: !!(user?.name && user.name.trim().length > 2), icon: "person" as const },
            { key: "follow", label: "3 kisiyi takip et", done: followingCount >= 3, icon: "people" as const },
            { key: "social", label: "Bir kudos veya yorum yap", done: badges.length > 0 || (stats?.totalRuns || 0) > 1, icon: "heart" as const },
          ];
          const doneCount = milestones.filter((m) => m.done).length;
          if (doneCount >= milestones.length) return null;
          return (
            <View style={s.milestonesCard}>
              <View style={s.milestonesHeader}>
                <Text style={s.milestonesTitle}>BASLANGIC HEDEFLERI</Text>
                <Text style={s.milestonesProgress}>{doneCount}/{milestones.length}</Text>
              </View>
              <View style={s.milestonesBar}>
                <View style={[s.milestonesBarFill, { width: `${(doneCount / milestones.length) * 100}%` }]} />
              </View>
              {milestones.map((m) => (
                <View key={m.key} style={s.milestoneRow}>
                  <View style={[s.milestoneCheck, m.done && s.milestoneCheckDone]}>
                    {m.done ? (
                      <Ionicons name="checkmark" size={12} color={brand.bg} />
                    ) : (
                      <Ionicons name={m.icon} size={12} color={brand.textDim} />
                    )}
                  </View>
                  <Text style={[s.milestoneLabel, m.done && s.milestoneLabelDone]}>{m.label}</Text>
                </View>
              ))}
            </View>
          );
        })()}

        {/* Weekly Goal + Streak */}
        {weeklyGoal && (
          <View style={s.goalCard}>
            <View style={s.goalHeader}>
              <Text style={s.goalTitle}>HAFTALIK HEDEF</Text>
              {weeklyGoal.goal.currentStreak > 0 && (
                <View style={s.streakBadge}>
                  <Ionicons name="flame" size={12} color={brand.bg} />
                  <Text style={s.streakText}>{weeklyGoal.goal.currentStreak} hafta</Text>
                </View>
              )}
            </View>
            {/* Distance progress */}
            <View style={s.goalRow}>
              <View style={s.goalInfo}>
                <Text style={s.goalMetric}>{(weeklyGoal.progress.totalDistanceM / 1000).toFixed(1)} / {(weeklyGoal.goal.distanceGoalM / 1000).toFixed(0)} km</Text>
                <Text style={s.goalLabel}>Mesafe</Text>
              </View>
              <View style={s.goalBarOuter}>
                <View style={[s.goalBarInner, {
                  width: `${weeklyGoal.goal.distanceGoalM > 0 ? Math.min(100, (weeklyGoal.progress.totalDistanceM / weeklyGoal.goal.distanceGoalM) * 100) : 0}%`,
                  backgroundColor: weeklyGoal.progress.distanceGoalMet ? "#4CAF50" : brand.accent,
                }]} />
              </View>
            </View>
            {/* Runs progress */}
            <View style={s.goalRow}>
              <View style={s.goalInfo}>
                <Text style={s.goalMetric}>{weeklyGoal.progress.totalRuns} / {weeklyGoal.goal.runsGoal} kosu</Text>
                <Text style={s.goalLabel}>Kosu sayisi</Text>
              </View>
              <View style={s.goalBarOuter}>
                <View style={[s.goalBarInner, {
                  width: `${weeklyGoal.goal.runsGoal > 0 ? Math.min(100, (weeklyGoal.progress.totalRuns / weeklyGoal.goal.runsGoal) * 100) : 0}%`,
                  backgroundColor: weeklyGoal.progress.runsGoalMet ? "#4CAF50" : brand.accent,
                }]} />
              </View>
            </View>
            {weeklyGoal.progress.weekComplete && (
              <Text style={s.goalComplete}>Bu haftaki hedefini tamamladin!</Text>
            )}
          </View>
        )}

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

          </View>
        )}

        {/* ═══ AKTIVITELER TAB ═══ */}
        {profileTab === "activities" && (
          <View>
            <Text style={s.sectionTitle}>SON AKTIVITELER</Text>
            {myActivities.length > 0 ? myActivities.map((a) => (
              <TouchableOpacity key={a.id} style={s.activityRow} onPress={() => router.push(`/activity/${a.id}` as never)} activeOpacity={0.7}>
                <View style={s.activityIcon}>
                  <Ionicons name="footsteps-outline" size={18} color={brand.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.activityTitle}>{a.title}</Text>
                  <Text style={s.activityMeta}>
                    {formatDate(a.startTime)} · {formatDistance(a.distanceM)} km · {formatPace(a.avgPaceSecKm)} /km
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={brand.textDim} />
              </TouchableOpacity>
            )) : (
              <View style={s.emptyBadges}>
                <Ionicons name="walk-outline" size={32} color={brand.textDim} />
                <Text style={s.emptyBadgesText}>Henuz aktivite yok</Text>
                <Text style={s.emptyBadgesHint}>Bir kosu baslat veya Strava'dan senkronize et</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ BASARILAR TAB ═══ */}
        {profileTab === "achievements" && (
          <View>
            {/* Personal Records */}
            {personalRecords.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>KISISEL REKORLAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.prScroll}>
                  {personalRecords.map((pr) => (
                    <View key={pr.distance} style={s.prCard}>
                      <Ionicons name="trophy" size={16} color="#FFD700" />
                      <Text style={s.prDistance}>{pr.distance}</Text>
                      <Text style={s.prTime}>{formatDuration(pr.timeSec)}</Text>
                      {pr.improvement != null && pr.improvement > 0 && (
                        <View style={s.prImpRow}>
                          <Ionicons name="arrow-up" size={10} color={brand.success} />
                          <Text style={s.prImpText}>{pr.improvement.toFixed(1)}%</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Badges */}
            {badges.length > 0 ? (
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
            ) : (
              <View style={s.emptyBadges}>
                <Ionicons name="trophy-outline" size={32} color={brand.textDim} />
                <Text style={s.emptyBadgesText}>Henuz basari yok</Text>
                <Text style={s.emptyBadgesHint}>Kosu yap, hedef tamamla, rozet kazan!</Text>
              </View>
            )}
          </View>
        )}
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
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: brand.surface, borderWidth: 2, borderColor: brand.accent, justifyContent: "center", alignItems: "center", marginBottom: 16, shadowColor: brand.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8 },
  avatarImage: { width: 92, height: 92, borderRadius: 46 },
  avatarText: { fontSize: 28, fontWeight: "bold", color: brand.accent },
  name: { fontSize: 22, fontWeight: "800", color: brand.text, letterSpacing: 2 },
  email: { fontSize: 13, color: brand.textDim, marginTop: 4 },
  editProfileBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 12, borderWidth: 1, borderColor: brand.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 8 },
  editProfileText: { fontSize: 11, fontWeight: "600" as const, color: brand.accent, letterSpacing: 2 },

  // Followers
  followRow: { flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 24 },
  followBadge: { alignItems: "center", backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 20 },
  followCount: { fontSize: 18, fontWeight: "bold", color: brand.text },
  followLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 2 },

  // Weekly goal card
  goalCard: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 12, padding: 16, marginBottom: 16 },
  goalHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 14 },
  goalTitle: { fontSize: 11, fontWeight: "600" as const, color: brand.textMuted, letterSpacing: 3 },
  streakBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: "#FF6B35", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  streakText: { fontSize: 11, fontWeight: "700" as const, color: brand.bg },
  goalRow: { marginBottom: 12 },
  goalInfo: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 6 },
  goalMetric: { fontSize: 14, fontWeight: "600" as const, color: brand.text },
  goalLabel: { fontSize: 11, color: brand.textDim },
  goalBarOuter: { height: 6, backgroundColor: brand.border, borderRadius: 3, overflow: "hidden" as const },
  goalBarInner: { height: 6, borderRadius: 3 },
  goalComplete: { fontSize: 13, color: "#4CAF50", fontWeight: "600" as const, textAlign: "center" as const, marginTop: 4 },
  // Activation milestones
  milestonesCard: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 12, padding: 16, marginBottom: 16 },
  milestonesHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 10 },
  milestonesTitle: { fontSize: 11, fontWeight: "600" as const, color: brand.textMuted, letterSpacing: 3 },
  milestonesProgress: { fontSize: 12, fontWeight: "700" as const, color: brand.accent },
  milestonesBar: { height: 4, backgroundColor: brand.border, borderRadius: 2, marginBottom: 14, overflow: "hidden" as const },
  milestonesBarFill: { height: 4, backgroundColor: brand.accent, borderRadius: 2 },
  milestoneRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 6 },
  milestoneCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: brand.border, alignItems: "center" as const, justifyContent: "center" as const },
  milestoneCheckDone: { backgroundColor: brand.accent, borderColor: brand.accent },
  milestoneLabel: { fontSize: 13, color: brand.textMuted, fontWeight: "500" as const },
  milestoneLabelDone: { color: brand.textDim, textDecorationLine: "line-through" as const },
  weeklyCard: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 8, padding: 16, marginBottom: 16, alignItems: "center" as const },
  weeklyTitle: { fontSize: 11, fontWeight: "bold" as const, color: brand.textDim, letterSpacing: 3, marginBottom: 8 },
  weeklyStats: { fontSize: 14, color: brand.text, marginBottom: 4 },
  weeklyChange: { fontSize: 12, fontWeight: "600" as const },
  weeklyEmpty: { fontSize: 12, color: brand.textMuted, fontStyle: "italic" as const },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, padding: 18, borderRadius: 12, alignItems: "center" },
  statValue: { fontSize: 26, fontWeight: "800", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 6 },

  // Invite
  inviteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: brand.accent, paddingVertical: 14, borderRadius: 4, marginBottom: 16 },
  inviteButtonText: { fontSize: 12, fontWeight: "700", color: brand.bg, letterSpacing: 2 },

  // Profile Tabs (Strava-style)
  profileTabs: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: brand.border, marginBottom: 20 },
  profileTab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  profileTabActive: { borderBottomWidth: 2, borderBottomColor: brand.accent, marginBottom: -2 },
  profileTabText: { fontSize: 11, fontWeight: "600", color: brand.textDim, letterSpacing: 2 },
  profileTabTextActive: { color: brand.accent },

  // Activity rows (Aktiviteler tab)
  activityRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: brand.border,
  },
  activityIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: brand.accentDim,
    alignItems: "center", justifyContent: "center",
  },
  activityTitle: { fontSize: 14, fontWeight: "600", color: brand.text },
  activityMeta: { fontSize: 12, color: brand.textDim, marginTop: 2 },

  // Personal Records
  prScroll: { gap: 10, paddingRight: 16 },
  prCard: {
    backgroundColor: brand.elevated, borderRadius: 12, padding: 14, alignItems: "center",
    minWidth: 90, borderWidth: 1, borderColor: "rgba(255,215,0,0.15)",
  },
  prDistance: { fontSize: 13, fontWeight: "800", color: "#FFD700", marginTop: 6, letterSpacing: 1 },
  prTime: { fontSize: 16, fontWeight: "700", color: brand.text, marginTop: 4 },
  prImpRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  prImpText: { fontSize: 11, fontWeight: "600", color: brand.success },

  // Trophy Case
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 12, color: brand.accent, fontWeight: "600" },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeItem: { alignItems: "center", width: 72 },
  badgeIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: brand.elevated,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,215,0,0.2)",
    shadowColor: "#FFD700", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  badgeEmoji: { fontSize: 26 },
  badgeName: { fontSize: 10, color: brand.textDim, textAlign: "center", marginTop: 6 },
  emptyBadges: { alignItems: "center", padding: 24, gap: 8 },
  emptyBadgesText: { fontSize: 14, fontWeight: "600", color: brand.textMuted },
  emptyBadgesHint: { fontSize: 12, color: brand.textDim },

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
