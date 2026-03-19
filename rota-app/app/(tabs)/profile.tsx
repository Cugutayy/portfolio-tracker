import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import { clearToken, getUser } from "@/lib/auth";
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

  const loadProfile = useCallback(async () => {
    try {
      const cached = await getUser();
      if (cached) setUser(cached);

      const data = await API.getProfile();
      const profile = data as unknown as {
        id: string;
        name: string;
        email: string;
        totalRuns?: number;
        totalDistanceKm?: number;
        avgPaceSecKm?: number;
        stravaConnected?: boolean;
      };
      setUser({ id: profile.id, name: profile.name, email: profile.email });
      setStats({
        totalRuns: profile.totalRuns || 0,
        totalDistanceKm: profile.totalDistanceKm || 0,
        avgPaceSecKm: profile.avgPaceSecKm || 0,
        stravaConnected: profile.stravaConnected || false,
      });
    } catch {
      const cached = await getUser();
      if (cached) setUser(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  const handleLogout = () => {
    Alert.alert("Cikis Yap", "Hesabindan cikmak istiyor musun?", [
      { text: "Vazgec", style: "cancel" },
      {
        text: "Cikis Yap",
        style: "destructive",
        onPress: async () => {
          await clearToken();
          router.replace("/login");
        },
      },
    ]);
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
        {/* Avatar + Name */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{user?.name || "Kullanici"}</Text>
          <Text style={s.email}>{user?.email || ""}</Text>
        </View>

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

        {/* Health Data Import */}
        <TouchableOpacity
          style={s.healthButton}
          onPress={() => router.push("/import-activity")}
        >
          <Ionicons name="heart-outline" size={18} color={brand.accent} />
          <Text style={s.healthButtonText}>SAGLIK VERİLERİNİ İCE AKTAR</Text>
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
                  {syncing ? "SENKRONİZE EDİLİYOR..." : "STRAVA SYNC"}
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
                  // Reload profile after returning from browser
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

        {/* Logout */}
        <TouchableOpacity style={s.logoutButton} onPress={handleLogout}>
          <Text style={s.logoutText}>CIKIS YAP</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24 },
  profileHeader: { alignItems: "center", paddingVertical: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: brand.surface, borderWidth: 2, borderColor: brand.accent, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  avatarText: { fontSize: 24, fontWeight: "bold", color: brand.accent },
  name: { fontSize: 20, fontWeight: "bold", color: brand.text, letterSpacing: 2 },
  email: { fontSize: 13, color: brand.textDim, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, padding: 16, borderRadius: 4, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },
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
  logoutButton: { borderWidth: 1, borderColor: brand.border, paddingVertical: 14, borderRadius: 4, alignItems: "center", marginTop: 16 },
  logoutText: { fontSize: 12, color: brand.textMuted, letterSpacing: 2, fontWeight: "600" },
});
