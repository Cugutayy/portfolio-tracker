import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Vibration,
} from "react-native";
import * as Location from "expo-location";
import polyline from "@mapbox/polyline";
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import { formatDuration, formatDistance, formatPace } from "@/lib/format";

type TrackState = "idle" | "running" | "finished";

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TrackScreen() {
  const [state, setState] = useState<TrackState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [coords, setCoords] = useState<Coordinate[]>([]);
  const [saving, setSaving] = useState(false);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Timer
  useEffect(() => {
    if (state === "running") {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const startRun = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Konum Izni", "Kosu takibi icin konum izni gerekli.");
      return;
    }

    setCoords([]);
    setDistanceM(0);
    setSeconds(0);
    startTimeRef.current = new Date();
    setState("running");
    Vibration.vibrate(100);

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        const timestamp = location.timestamp;

        setCoords((prev) => {
          const newCoords = [...prev, { latitude, longitude, timestamp }];

          // Calculate distance from previous point
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = haversineDistance(last.latitude, last.longitude, latitude, longitude);
            if (d > 2 && d < 100) {
              setDistanceM((prevD) => prevD + d);
            }
          }

          return newCoords;
        });
      }
    );
  }, []);

  const stopRun = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setState("finished");
    Vibration.vibrate([0, 100, 50, 100]);
  }, []);

  const saveRun = useCallback(async () => {
    if (coords.length < 2 || distanceM < 50) {
      Alert.alert("Cok kisa", "Kosu kaydedilecek kadar uzun degil.");
      return;
    }

    setSaving(true);
    try {
      const encoded = polyline.encode(coords.map((c) => [c.latitude, c.longitude]));

      await API.createActivity({
        title: `Kosu — ${formatDistance(distanceM)} km`,
        distanceM,
        movingTimeSec: seconds,
        startTime: startTimeRef.current?.toISOString() || new Date().toISOString(),
        activityType: "Run",
        polylineEncoded: encoded,
        startLat: coords[0].latitude,
        startLng: coords[0].longitude,
        endLat: coords[coords.length - 1].latitude,
        endLng: coords[coords.length - 1].longitude,
      });

      Alert.alert("Kaydedildi!", `${formatDistance(distanceM)} km kosu kaydedildi.`, [
        { text: "Tamam", onPress: () => {
          setState("idle");
          setSeconds(0);
          setDistanceM(0);
          setCoords([]);
          router.push("/(tabs)");
        }},
      ]);
    } catch (err) {
      Alert.alert("Hata", "Kosu kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }, [coords, distanceM, seconds]);

  const discardRun = useCallback(() => {
    Alert.alert("Iptal et?", "Bu kosu kaydedilmeyecek.", [
      { text: "Vazgec", style: "cancel" },
      { text: "Iptal et", style: "destructive", onPress: () => {
        setState("idle");
        setSeconds(0);
        setDistanceM(0);
        setCoords([]);
      }},
    ]);
  }, []);

  const currentPace = seconds > 0 && distanceM > 0 ? seconds / (distanceM / 1000) : 0;

  return (
    <SafeAreaView style={s.container}>
      {/* State: IDLE */}
      {state === "idle" && (
        <View style={s.idleContainer}>
          <Text style={s.idleTitle}>KOSUYA HAZIR MISIN?</Text>
          <Text style={s.idleSubtitle}>GPS ile kosu rotani takip et</Text>
          <TouchableOpacity style={s.startButton} onPress={startRun} activeOpacity={0.8}>
            <Text style={s.startButtonText}>BASLA</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* State: RUNNING */}
      {state === "running" && (
        <View style={s.runningContainer}>
          <View style={s.mainStat}>
            <Text style={s.mainValue}>{formatDistance(distanceM)}</Text>
            <Text style={s.mainLabel}>KM</Text>
          </View>

          <View style={s.statsGrid}>
            <View style={s.gridItem}>
              <Text style={s.gridValue}>{formatDuration(seconds)}</Text>
              <Text style={s.gridLabel}>SURE</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.gridValue}>{formatPace(currentPace)}</Text>
              <Text style={s.gridLabel}>TEMPO</Text>
            </View>
          </View>

          <Text style={s.coordCount}>{coords.length} GPS noktasi</Text>

          <TouchableOpacity style={s.stopButton} onPress={stopRun} activeOpacity={0.8}>
            <Text style={s.stopButtonText}>BITIR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* State: FINISHED */}
      {state === "finished" && (
        <View style={s.finishedContainer}>
          <Text style={s.finishedTitle}>KOSU TAMAMLANDI!</Text>

          <View style={s.summaryGrid}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{formatDistance(distanceM)}</Text>
              <Text style={s.summaryLabel}>KM</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{formatDuration(seconds)}</Text>
              <Text style={s.summaryLabel}>SURE</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{formatPace(currentPace)}</Text>
              <Text style={s.summaryLabel}>TEMPO</Text>
            </View>
          </View>

          <TouchableOpacity style={s.saveButton} onPress={saveRun} disabled={saving} activeOpacity={0.8}>
            <Text style={s.saveButtonText}>{saving ? "KAYDEDILİYOR..." : "KAYDET"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.discardButton} onPress={discardRun} activeOpacity={0.8}>
            <Text style={s.discardButtonText}>IPTAL ET</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },

  // IDLE
  idleContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  idleTitle: { fontSize: 24, fontWeight: "bold", color: brand.text, letterSpacing: 4, textAlign: "center" },
  idleSubtitle: { fontSize: 13, color: brand.textDim, marginTop: 8, marginBottom: 48 },
  startButton: { width: 180, height: 180, borderRadius: 90, backgroundColor: brand.accent, justifyContent: "center", alignItems: "center", shadowColor: brand.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20 },
  startButtonText: { fontSize: 28, fontWeight: "bold", color: brand.bg, letterSpacing: 6 },

  // RUNNING
  runningContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  mainStat: { alignItems: "center", marginBottom: 32 },
  mainValue: { fontSize: 72, fontWeight: "bold", color: brand.accent, letterSpacing: 2 },
  mainLabel: { fontSize: 14, color: brand.textMuted, letterSpacing: 4, marginTop: -4 },
  statsGrid: { flexDirection: "row", gap: 32, marginBottom: 32 },
  gridItem: { alignItems: "center" },
  gridValue: { fontSize: 28, fontWeight: "600", color: brand.text },
  gridLabel: { fontSize: 10, color: brand.textDim, letterSpacing: 3, marginTop: 4 },
  coordCount: { fontSize: 11, color: brand.textDim, marginBottom: 32 },
  stopButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#FF3B30", justifyContent: "center", alignItems: "center" },
  stopButtonText: { fontSize: 20, fontWeight: "bold", color: "#fff", letterSpacing: 4 },

  // FINISHED
  finishedContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  finishedTitle: { fontSize: 20, fontWeight: "bold", color: brand.accent, letterSpacing: 4, marginBottom: 32 },
  summaryGrid: { flexDirection: "row", gap: 24, marginBottom: 48 },
  summaryItem: { alignItems: "center", backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 8, padding: 20, minWidth: 90 },
  summaryValue: { fontSize: 24, fontWeight: "bold", color: brand.text },
  summaryLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 3, marginTop: 4 },
  saveButton: { backgroundColor: brand.accent, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 4, marginBottom: 16 },
  saveButtonText: { fontSize: 14, fontWeight: "700", color: brand.bg, letterSpacing: 2 },
  discardButton: { paddingVertical: 12 },
  discardButtonText: { fontSize: 12, color: brand.textDim, letterSpacing: 2 },
});
