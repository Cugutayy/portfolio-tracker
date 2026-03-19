import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
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

type Phase = "checking" | "importing" | "done" | "unavailable" | "empty" | "error";

export default function ImportActivityScreen() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [imported, setImported] = useState(0);
  const [total, setTotal] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    runAutoImport();
  }, []);

  async function runAutoImport() {
    // 1. Check if HealthKit is available
    const available = await isHealthKitAvailable();
    if (!available) {
      setPhase("unavailable");
      return;
    }

    // 2. Request permission (auto — system dialog appears)
    const authorized = await requestHealthKitAuth();
    if (!authorized) {
      setPhase("error");
      return;
    }

    // 3. Fetch workouts from last 30 days
    const workouts = await getHealthKitWorkouts(30);
    if (workouts.length === 0) {
      setPhase("empty");
      return;
    }

    // 4. Auto-import all workouts
    setTotal(workouts.length);
    setPhase("importing");

    let count = 0;
    for (const w of workouts) {
      try {
        await API.createActivity({
          title: `Kosu — ${new Date(w.startDate).toLocaleDateString("tr-TR")}`,
          distanceM: w.totalDistance || 0,
          movingTimeSec: Math.round(w.duration),
          startTime: w.startDate,
          activityType: "run",
        });
        count++;
      } catch {
        // skip duplicates or errors
      }
      setImported(count);
      setProgress((count / workouts.length) * 100);
    }

    setImported(count);
    setPhase("done");

    // Auto-close after 2 seconds
    setTimeout(() => router.back(), 2000);
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        {phase === "checking" && (
          <>
            <ActivityIndicator color={brand.accent} size="large" />
            <Text style={s.statusText}>Apple Health kontrol ediliyor...</Text>
          </>
        )}

        {phase === "importing" && (
          <>
            <View style={s.progressRing}>
              <Text style={s.progressNumber}>{imported}</Text>
              <Text style={s.progressTotal}>/ {total}</Text>
            </View>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={s.statusText}>Aktiviteler aktariliyor...</Text>
          </>
        )}

        {phase === "done" && (
          <>
            <View style={s.doneIcon}>
              <Ionicons name="checkmark" size={40} color={brand.bg} />
            </View>
            <Text style={s.doneTitle}>{imported} AKTİVİTE AKTARILDI</Text>
            <Text style={s.doneSubtext}>Otomatik olarak kapatiliyor...</Text>
          </>
        )}

        {phase === "empty" && (
          <>
            <Ionicons name="fitness-outline" size={56} color={brand.textDim} />
            <Text style={s.emptyTitle}>Kosu Bulunamadi</Text>
            <Text style={s.emptyText}>
              Son 30 gunde Apple Health'te kosu veya yuruyus kaydi yok.
            </Text>
            <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
              <Text style={s.closeBtnText}>KAPAT</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === "unavailable" && (
          <>
            <Ionicons name="heart-outline" size={56} color={brand.textDim} />
            <Text style={s.emptyTitle}>Apple Health Kullanilamiyor</Text>
            <Text style={s.emptyText}>
              Bu ozellik icin uygulamanin EAS build ile yuklenmesi gerekiyor.
              {"\n\n"}
              Kosu takibi icin alt bardaki Kosu sekmesini kullan — GPS ile otomatik kaydeder!
            </Text>
            <TouchableOpacity
              style={s.trackBtn}
              onPress={() => {
                router.back();
                setTimeout(() => router.push("/(tabs)/track"), 300);
              }}
            >
              <Ionicons name="walk-outline" size={18} color={brand.bg} />
              <Text style={s.trackBtnText}>KOSU BASLA</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === "error" && (
          <>
            <Ionicons name="close-circle-outline" size={56} color="#FF6B6B" />
            <Text style={s.emptyTitle}>Erisim Reddedildi</Text>
            <Text style={s.emptyText}>
              Apple Health erisim izni verilmedi. Ayarlar &gt; Gizlilik &gt; Saglik'tan izin verebilirsin.
            </Text>
            <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
              <Text style={s.closeBtnText}>KAPAT</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  statusText: {
    color: brand.textMuted,
    fontSize: 14,
    marginTop: 16,
    letterSpacing: 1,
  },
  progressRing: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  progressNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: brand.accent,
  },
  progressTotal: {
    fontSize: 20,
    color: brand.textDim,
    marginLeft: 4,
  },
  progressBar: {
    width: "80%",
    height: 4,
    backgroundColor: brand.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: brand.accent,
    borderRadius: 2,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brand.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: brand.accent,
    letterSpacing: 2,
  },
  doneSubtext: {
    fontSize: 12,
    color: brand.textDim,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: brand.text,
    marginTop: 16,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: brand.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 24,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.textMuted,
    letterSpacing: 2,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.bg,
    letterSpacing: 2,
  },
});
