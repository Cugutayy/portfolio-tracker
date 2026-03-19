import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import {
  isHealthKitAvailable,
  requestHealthKitAuth,
  getHealthKitWorkouts,
} from "@/lib/health";

interface HealthWorkout {
  startDate: string;
  duration: number;
  totalDistance?: number;
  totalEnergyBurned?: number;
}

export default function ImportActivityScreen() {
  const [healthAvailable, setHealthAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [workouts, setWorkouts] = useState<HealthWorkout[]>([]);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [importingAll, setImportingAll] = useState(false);

  useEffect(() => {
    isHealthKitAvailable().then((available) => {
      setHealthAvailable(available);
      if (available) {
        loadWorkouts();
      }
    });
  }, []);

  const loadWorkouts = useCallback(async () => {
    setLoading(true);
    const authorized = await requestHealthKitAuth();
    if (!authorized) {
      Alert.alert("Izin Gerekli", "Apple Health erisim izni verilmedi.");
      setLoading(false);
      return;
    }
    const data = await getHealthKitWorkouts(30);
    setWorkouts(data);
    setLoading(false);
  }, []);

  const importSingle = async (workout: HealthWorkout, index: number) => {
    try {
      await API.createActivity({
        title: `Kosu — ${new Date(workout.startDate).toLocaleDateString("tr-TR")}`,
        distanceM: workout.totalDistance || 0,
        movingTimeSec: Math.round(workout.duration),
        startTime: workout.startDate,
        activityType: "run",
      });
      setImportedIds((prev) => new Set(prev).add(index));
    } catch {
      Alert.alert("Hata", "Aktivite kaydedilemedi.");
    }
  };

  const importAll = async () => {
    setImportingAll(true);
    let count = 0;
    for (let i = 0; i < workouts.length; i++) {
      if (importedIds.has(i)) continue;
      try {
        await API.createActivity({
          title: `Kosu — ${new Date(workouts[i].startDate).toLocaleDateString("tr-TR")}`,
          distanceM: workouts[i].totalDistance || 0,
          movingTimeSec: Math.round(workouts[i].duration),
          startTime: workouts[i].startDate,
          activityType: "run",
        });
        setImportedIds((prev) => new Set(prev).add(i));
        count++;
      } catch {
        // skip failed ones
      }
    }
    setImportingAll(false);
    Alert.alert("Tamamlandi", `${count} aktivite iceri aktarildi!`, [
      { text: "Tamam", onPress: () => router.back() },
    ]);
  };

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
  };

  const renderWorkout = ({
    item,
    index,
  }: {
    item: HealthWorkout;
    index: number;
  }) => {
    const imported = importedIds.has(index);
    const d = new Date(item.startDate);
    return (
      <View style={s.card}>
        <View style={s.cardLeft}>
          <Text style={s.cardDate}>
            {d.getDate()}{" "}
            {d.toLocaleDateString("tr-TR", { month: "short" })}
          </Text>
          <Text style={s.cardTime}>
            {d.toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardDist}>
            {item.totalDistance
              ? `${(item.totalDistance / 1000).toFixed(1)} km`
              : "—"}
          </Text>
          <Text style={s.cardDur}>{formatDuration(item.duration)}</Text>
        </View>
        {imported ? (
          <View style={s.importedBadge}>
            <Ionicons name="checkmark" size={16} color={brand.accent} />
          </View>
        ) : (
          <TouchableOpacity
            style={s.importBtn}
            onPress={() => importSingle(item, index)}
          >
            <Ionicons name="add" size={18} color={brand.accent} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={brand.text} />
        </TouchableOpacity>
        <Text style={s.title}>SAGLIK VERİLERİ</Text>
      </View>

      {healthAvailable === null || loading ? (
        <View style={s.center}>
          <ActivityIndicator color={brand.accent} size="large" />
          <Text style={s.loadingText}>Apple Health kontrol ediliyor...</Text>
        </View>
      ) : !healthAvailable ? (
        <View style={s.center}>
          <Ionicons name="heart-outline" size={64} color={brand.textDim} />
          <Text style={s.unavailableTitle}>Apple Health Kulanilamiyor</Text>
          <Text style={s.unavailableText}>
            Apple Health entegrasyonu icin uygulama EAS build ile
            yuklenmis olmalidir.{"\n\n"}
            Simdilik kosu takip etmek icin alt bardaki{" "}
            <Text style={{ color: brand.accent }}>Kosu</Text> sekmesini
            kullanabilirsin — GPS ile otomatik kaydeder!
          </Text>
          <TouchableOpacity
            style={s.goTrackBtn}
            onPress={() => {
              router.back();
              setTimeout(() => router.push("/(tabs)/track"), 300);
            }}
          >
            <Ionicons name="walk-outline" size={18} color={brand.bg} />
            <Text style={s.goTrackText}>KOSU BASLA</Text>
          </TouchableOpacity>
        </View>
      ) : workouts.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="fitness-outline" size={64} color={brand.textDim} />
          <Text style={s.unavailableTitle}>Kosu Bulunamadi</Text>
          <Text style={s.unavailableText}>
            Son 30 gunde Apple Health'te kayitli kosu/yuruyus yok.
          </Text>
        </View>
      ) : (
        <>
          {/* Import all button */}
          <TouchableOpacity
            style={s.importAllBtn}
            onPress={importAll}
            disabled={importingAll}
          >
            {importingAll ? (
              <ActivityIndicator color={brand.bg} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={18} color={brand.bg} />
                <Text style={s.importAllText}>
                  TUMUNU ICERL AKTAR ({workouts.length - importedIds.size})
                </Text>
              </>
            )}
          </TouchableOpacity>

          <FlatList
            data={workouts}
            renderItem={renderWorkout}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={s.list}
          />
        </>
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
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: "bold", color: brand.text, letterSpacing: 3 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingText: { color: brand.textMuted, marginTop: 12, fontSize: 13 },
  unavailableTitle: { fontSize: 18, fontWeight: "bold", color: brand.text, marginTop: 16 },
  unavailableText: {
    fontSize: 13,
    color: brand.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
  },
  goTrackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  goTrackText: { fontSize: 12, fontWeight: "700", color: brand.bg, letterSpacing: 2 },
  importAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.accent,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  importAllText: { fontSize: 11, fontWeight: "700", color: brand.bg, letterSpacing: 1 },
  list: { padding: 16, gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    padding: 12,
  },
  cardLeft: { width: 50, alignItems: "center" },
  cardDate: { fontSize: 13, fontWeight: "700", color: brand.text },
  cardTime: { fontSize: 10, color: brand.textDim, marginTop: 2 },
  cardBody: { flex: 1, marginLeft: 12 },
  cardDist: { fontSize: 16, fontWeight: "700", color: brand.accent },
  cardDur: { fontSize: 12, color: brand.textMuted, marginTop: 2 },
  importBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: brand.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  importedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(230,255,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});
