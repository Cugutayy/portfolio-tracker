import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API, type LeaderboardEntry } from "@/lib/api";
import { formatPace } from "@/lib/format";

const PERIODS = [
  { key: "week", label: "HAFTA" },
  { key: "month", label: "AY" },
  { key: "year", label: "YIL" },
] as const;

type Period = (typeof PERIODS)[number]["key"];

const MEDALS = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState<Period>("month");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await API.getLeaderboard(period);
      setEntries(res.leaderboard);
    } catch {}
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard().finally(() => setLoading(false));
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  }, [fetchLeaderboard]);

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <TouchableOpacity
      style={s.row}
      onPress={() => router.push(`/member/${item.memberId}` as never)}
      activeOpacity={0.7}
    >
      <View style={s.rankCol}>
        {index < 3 ? (
          <Text style={s.medal}>{MEDALS[index]}</Text>
        ) : (
          <Text style={s.rank}>{item.rank}</Text>
        )}
      </View>
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {item.memberName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
        </Text>
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.memberName}</Text>
        <Text style={s.stats}>
          {item.totalRuns} kosu  {"\u00B7"}  {item.totalDistanceKm.toFixed(1)} km  {"\u00B7"}  {formatPace(item.avgPaceSecKm)} /km
        </Text>
      </View>
      <Text style={s.distance}>{item.totalDistanceKm.toFixed(1)} km</Text>
    </TouchableOpacity>
  );

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

      <View style={s.header}>
        <Text style={s.title}>LIDER TABLOSU</Text>
      </View>

      {/* Period filter chips */}
      <View style={s.filters}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[s.chip, period === p.key && s.chipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[s.chipText, period === p.key && s.chipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator color={brand.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.memberId}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>Henuz veri yok</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 18, fontWeight: "bold", color: brand.text, letterSpacing: 4 },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  chipActive: {
    borderColor: brand.accent,
    backgroundColor: "rgba(230, 255, 0, 0.1)",
  },
  chipText: { fontSize: 11, fontWeight: "600", color: brand.textMuted, letterSpacing: 1 },
  chipTextActive: { color: brand.accent },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: {
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
  rankCol: { width: 28, alignItems: "center" },
  medal: { fontSize: 18 },
  rank: { fontSize: 14, fontWeight: "bold", color: brand.textDim },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "bold", color: brand.accent },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: brand.text, marginBottom: 2 },
  stats: { fontSize: 11, color: brand.textDim },
  distance: { fontSize: 14, fontWeight: "700", color: brand.accent },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: brand.textMuted },
});
