import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { brand } from "@/constants/Colors";
import { API, type Activity, type Split } from "@/lib/api";
import { formatDistance, formatPace, formatDuration, formatDate, formatTime } from "@/lib/format";

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    API.getActivity(id)
      .then((data) => {
        setActivity(data.activity);
        setSplits(data.splits || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator color={brand.accent} size="large" />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.errorText}>Aktivite bulunamadi</Text>
      </View>
    );
  }

  const statItems = [
    { label: "MESAFE", value: `${formatDistance(activity.distanceM)} km` },
    { label: "SURE", value: formatDuration(activity.movingTimeSec) },
    { label: "TEMPO", value: `${formatPace(activity.avgPaceSecKm)} /km` },
    ...(activity.elevationGainM ? [{ label: "TIRMANIS", value: `${Math.round(activity.elevationGainM)} m` }] : []),
    ...(activity.avgHeartrate ? [{ label: "ORT. KAH", value: `${Math.round(activity.avgHeartrate)} bpm` }] : []),
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Title + Meta */}
      <Text style={s.title}>{activity.title}</Text>
      <Text style={s.meta}>
        {formatDate(activity.startTime)} · {formatTime(activity.startTime)} · {activity.activityType}
      </Text>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        {statItems.map((item) => (
          <View key={item.label} style={s.statBox}>
            <Text style={s.statValue}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Splits */}
      {splits.length > 0 && (
        <View style={s.splitsSection}>
          <Text style={s.sectionTitle}>KM BAZINDA DETAY</Text>
          <View style={s.splitsHeader}>
            <Text style={[s.splitCell, s.splitHeaderText, { flex: 0.5 }]}>KM</Text>
            <Text style={[s.splitCell, s.splitHeaderText]}>TEMPO</Text>
            <Text style={[s.splitCell, s.splitHeaderText]}>SURE</Text>
            {splits[0]?.avgHeartrate != null && (
              <Text style={[s.splitCell, s.splitHeaderText]}>KAH</Text>
            )}
          </View>
          {splits.map((split) => (
            <View key={split.splitIndex} style={s.splitRow}>
              <Text style={[s.splitCell, { flex: 0.5, color: brand.textDim }]}>
                {split.splitIndex}
              </Text>
              <Text style={[s.splitCell, { color: brand.accent }]}>
                {formatPace(split.avgPaceSecKm)}
              </Text>
              <Text style={s.splitCell}>
                {formatDuration(split.movingTimeSec)}
              </Text>
              {split.avgHeartrate != null && (
                <Text style={[s.splitCell, { color: brand.strava }]}>
                  {Math.round(split.avgHeartrate)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brand.bg },
  errorText: { color: brand.textMuted, fontSize: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: brand.text, letterSpacing: 1, marginBottom: 4 },
  meta: { fontSize: 12, color: brand.textDim, letterSpacing: 1, marginBottom: 24 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  statBox: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, minWidth: "30%", flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },
  splitsSection: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16 },
  sectionTitle: { fontSize: 11, color: brand.textMuted, letterSpacing: 3, fontWeight: "600", marginBottom: 12 },
  splitsHeader: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: brand.border },
  splitHeaderText: { color: brand.textDim, fontSize: 10, letterSpacing: 2 },
  splitRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: brand.border },
  splitCell: { flex: 1, fontSize: 13, color: brand.text, textAlign: "center" },
});
