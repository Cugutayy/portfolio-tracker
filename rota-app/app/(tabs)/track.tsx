import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Vibration,
  BackHandler,
} from "react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import polyline from "@mapbox/polyline";
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import { formatDuration, formatDistance, formatPace } from "@/lib/format";

type TrackState = "idle" | "running" | "paused" | "finished";

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
  const [gpsLost, setGpsLost] = useState(false);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  // Rolling pace: keep last 5 distance samples for smoothing
  const recentPaces = useRef<number[]>([]);
  // Auto-pause refs
  const lowSpeedSince = useRef<number | null>(null);
  const autoPaused = useRef(false);
  // Manual pause ref — prevents auto-resume after explicit pause
  const manuallyPaused = useRef(false);
  // GPS signal loss ref
  const lastLocationTime = useRef<number>(Date.now());
  // Voice announcement ref
  const lastAnnouncedKm = useRef(0);

  // Prevent accidental back during active run
  useEffect(() => {
    if (state !== "running" && state !== "paused") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(
        "Kosu Devam Ediyor",
        "Geri donersen kosu verisi kaybolur. Devam etmek istiyor musun?",
        [
          { text: "Devam Et", style: "cancel" },
          {
            text: "Kosuyu Bitir",
            style: "destructive",
            onPress: stopRun,
          },
        ],
      );
      return true; // prevent default back
    });
    return () => handler.remove();
  }, [state]);

  // Timer — runs only during "running" state
  useEffect(() => {
    if (state !== "running") return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state]);

  // GPS signal loss detection
  useEffect(() => {
    if (state !== "running") return;
    const interval = setInterval(() => {
      if (Date.now() - lastLocationTime.current > 30000) {
        setGpsLost(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [state]);

  // Cleanup on unmount — prevent memory leaks
  useEffect(() => {
    return () => {
      locationSub.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Shared location update handler
  const handleLocationUpdate = useCallback((location: Location.LocationObject) => {
    const { latitude, longitude, accuracy } = location.coords;
    const timestamp = location.timestamp;

    // 1.1 GPS Accuracy Filtering
    if (accuracy && accuracy > 20) return;

    // Update GPS signal tracking
    lastLocationTime.current = Date.now();
    setGpsLost(false);

    // Skip distance/pace updates if auto-paused (still track coords for GPS signal)
    if (autoPaused.current) {
      // Don't auto-resume if user explicitly paused
      if (manuallyPaused.current) return;
      // Check if we should auto-resume (hysteresis: resume at 2.0 km/h, pause at 1.0)
      setCoords((prev) => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const d = haversineDistance(last.latitude, last.longitude, latitude, longitude);
          const timeDiff = (timestamp - last.timestamp) / 1000;
          const speedKmH = timeDiff > 0 ? (d / timeDiff) * 3.6 : 0;
          if (speedKmH >= 2.0) {
            lowSpeedSince.current = null;
            autoPaused.current = false;
            setState("running");
            Vibration.vibrate(50);
          }
        }
        return prev; // don't add coords while auto-paused
      });
      return;
    }

    setCoords((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const d = haversineDistance(last.latitude, last.longitude, latitude, longitude);
        // Filter GPS noise (< 3m) and spikes (> 100m in one reading)
        if (d < 3 || d > 100) {
          return prev; // discard noisy point
        }

        const timeDiff = (timestamp - last.timestamp) / 1000;

        // Speed sanity check: reject GPS spikes (12 m/s = 43 km/h, impossible for running)
        const speedMs = d / timeDiff;
        if (speedMs > 12) return prev;

        // 1.2 Auto-pause: check speed
        const speedKmH = timeDiff > 0 ? (d / timeDiff) * 3.6 : 0;
        if (speedKmH < 1.0) {
          if (lowSpeedSince.current === null) {
            lowSpeedSince.current = Date.now();
          } else if (Date.now() - lowSpeedSince.current > 10000) {
            // Auto-pause: stop timer but keep location watching
            autoPaused.current = true;
            setState("paused");
            Vibration.vibrate(50);
            return prev; // don't add this point
          }
        } else {
          lowSpeedSince.current = null;
        }

        setDistanceM((prevD) => {
          const newDist = prevD + d;

          // 1.4 Voice KM announcement
          const currentKm = Math.floor(newDist / 1000);
          if (currentKm > lastAnnouncedKm.current && currentKm > 0) {
            lastAnnouncedKm.current = currentKm;
            // Use smoothed pace (rolling average) for more accurate announcement
            const rollingPace = recentPaces.current.length > 0
              ? recentPaces.current.reduce((a, b) => a + b, 0) / recentPaces.current.length
              : 0;
            const paceMin = Math.floor(rollingPace / 60);
            const paceSec = Math.round(rollingPace % 60);
            Speech.speak(
              `${currentKm} kilometre tamamlandi. Tempo: ${paceMin} dakika ${paceSec} saniye.`,
              { language: "tr-TR", rate: 1.1 },
            );
          }

          return newDist;
        });

        // Track pace samples for smoothing
        if (d > 0 && timeDiff > 0) {
          const paceSecKm = (timeDiff / d) * 1000;
          recentPaces.current = [...recentPaces.current.slice(-4), paceSecKm];
        }
      }

      return [...prev, { latitude, longitude, timestamp }];
    });
  }, []);

  const startRun = useCallback(async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      Alert.alert("Konum Izni", "Kosu takibi icin konum izni gerekli.");
      return;
    }

    // Request background permission — wrapped in try/catch because
    // Expo Go doesn't support background location (needs dev build)
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== "granted") {
        Alert.alert(
          "Arka Plan Konum",
          "Arka plan konum izni verilmedi. Telefon kilitlenirse takip durabilir.",
          [{ text: "Tamam" }],
        );
      }
    } catch {
      // Expo Go — background location not available, foreground tracking still works
      console.log("Background location not available (Expo Go)");
    }

    setCoords([]);
    setDistanceM(0);
    setSeconds(0);
    recentPaces.current = [];
    lowSpeedSince.current = null;
    autoPaused.current = false;
    manuallyPaused.current = false;
    lastAnnouncedKm.current = 0;
    lastLocationTime.current = Date.now();
    setGpsLost(false);
    startTimeRef.current = new Date();
    setState("running");
    Vibration.vibrate(100);

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (location) => handleLocationUpdate(location),
    );
  }, [handleLocationUpdate]);

  const pauseRun = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
    autoPaused.current = false;
    lowSpeedSince.current = null;
    manuallyPaused.current = true;
    setState("paused");
    Vibration.vibrate(50);
  }, []);

  const resumeRun = useCallback(async () => {
    autoPaused.current = false;
    lowSpeedSince.current = null;
    manuallyPaused.current = false;
    setState("running");
    Vibration.vibrate(50);

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (location) => handleLocationUpdate(location),
    );
  }, [handleLocationUpdate]);

  const stopRun = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    autoPaused.current = false;
    lowSpeedSince.current = null;
    setGpsLost(false);
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
        activityType: "run",
        polylineEncoded: encoded,
        startLat: coords[0].latitude,
        startLng: coords[0].longitude,
        endLat: coords[coords.length - 1].latitude,
        endLng: coords[coords.length - 1].longitude,
      });

      Alert.alert("Kaydedildi!", `${formatDistance(distanceM)} km kosu kaydedildi.`, [
        {
          text: "Tamam",
          onPress: () => {
            setState("idle");
            setSeconds(0);
            setDistanceM(0);
            setCoords([]);
            recentPaces.current = [];
            lowSpeedSince.current = null;
            autoPaused.current = false;
            lastAnnouncedKm.current = 0;
            setGpsLost(false);
            router.push("/(tabs)");
          },
        },
      ]);
    } catch {
      Alert.alert("Hata", "Kosu kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }, [coords, distanceM, seconds]);

  const discardRun = useCallback(() => {
    Alert.alert("Iptal et?", "Bu kosu kaydedilmeyecek.", [
      { text: "Vazgec", style: "cancel" },
      {
        text: "Iptal et",
        style: "destructive",
        onPress: () => {
          setState("idle");
          setSeconds(0);
          setDistanceM(0);
          setCoords([]);
          recentPaces.current = [];
          lowSpeedSince.current = null;
          autoPaused.current = false;
          lastAnnouncedKm.current = 0;
          setGpsLost(false);
        },
      },
    ]);
  }, []);

  // Smoothed pace (rolling average of last 5 samples)
  const smoothedPace =
    recentPaces.current.length > 0
      ? recentPaces.current.reduce((a, b) => a + b, 0) / recentPaces.current.length
      : seconds > 0 && distanceM > 0
        ? seconds / (distanceM / 1000)
        : 0;

  return (
    <SafeAreaView style={s.container}>
      {/* GPS Signal Loss Banner */}
      {gpsLost && (state === "running" || state === "paused") && (
        <View style={s.gpsLostBanner}>
          <Text style={s.gpsLostText}>GPS sinyali kaybedildi</Text>
        </View>
      )}

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
              <Text style={s.gridValue}>{formatPace(smoothedPace)}</Text>
              <Text style={s.gridLabel}>TEMPO</Text>
            </View>
          </View>

          <Text style={s.coordCount}>{coords.length} GPS noktasi</Text>

          <View style={s.runButtons}>
            <TouchableOpacity style={s.pauseButton} onPress={pauseRun} activeOpacity={0.8}>
              <Text style={s.pauseButtonText}>DURAKLAT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stopButton} onPress={stopRun} activeOpacity={0.8}>
              <Text style={s.stopButtonText}>BITIR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* State: PAUSED */}
      {state === "paused" && (
        <View style={s.runningContainer}>
          {autoPaused.current && (
            <Text style={s.autoPauseText}>Otomatik Duraklama</Text>
          )}
          <View style={s.mainStat}>
            <Text style={[s.mainValue, { opacity: 0.5 }]}>{formatDistance(distanceM)}</Text>
            <Text style={s.mainLabel}>KM — DURAKLATILDI</Text>
          </View>

          <View style={s.statsGrid}>
            <View style={s.gridItem}>
              <Text style={s.gridValue}>{formatDuration(seconds)}</Text>
              <Text style={s.gridLabel}>SURE</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.gridValue}>{formatPace(smoothedPace)}</Text>
              <Text style={s.gridLabel}>TEMPO</Text>
            </View>
          </View>

          <View style={s.runButtons}>
            <TouchableOpacity style={s.resumeButton} onPress={resumeRun} activeOpacity={0.8}>
              <Text style={s.resumeButtonText}>DEVAM ET</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stopButton} onPress={stopRun} activeOpacity={0.8}>
              <Text style={s.stopButtonText}>BITIR</Text>
            </TouchableOpacity>
          </View>
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
              <Text style={s.summaryValue}>{formatPace(smoothedPace)}</Text>
              <Text style={s.summaryLabel}>TEMPO</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.saveButton, saving && s.saveButtonDisabled]}
            onPress={saveRun}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={s.saveButtonText}>{saving ? "KAYDEDILIYOR..." : "KAYDET"}</Text>
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

  // RUNNING + PAUSED
  runningContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  mainStat: { alignItems: "center", marginBottom: 32 },
  mainValue: { fontSize: 72, fontWeight: "bold", color: brand.accent, letterSpacing: 2 },
  mainLabel: { fontSize: 14, color: brand.textMuted, letterSpacing: 4, marginTop: -4 },
  statsGrid: { flexDirection: "row", gap: 32, marginBottom: 32 },
  gridItem: { alignItems: "center" },
  gridValue: { fontSize: 28, fontWeight: "600", color: brand.text },
  gridLabel: { fontSize: 10, color: brand.textDim, letterSpacing: 3, marginTop: 4 },
  coordCount: { fontSize: 11, color: brand.textDim, marginBottom: 32 },
  runButtons: { flexDirection: "row", gap: 20, alignItems: "center" },
  pauseButton: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: brand.accent, justifyContent: "center", alignItems: "center" },
  pauseButtonText: { fontSize: 12, fontWeight: "bold", color: brand.accent, letterSpacing: 2 },
  resumeButton: { width: 100, height: 100, borderRadius: 50, backgroundColor: brand.accent, justifyContent: "center", alignItems: "center" },
  resumeButtonText: { fontSize: 12, fontWeight: "bold", color: brand.bg, letterSpacing: 2 },
  stopButton: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#FF3B30", justifyContent: "center", alignItems: "center" },
  stopButtonText: { fontSize: 14, fontWeight: "bold", color: "#fff", letterSpacing: 4 },

  // FINISHED
  finishedContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  finishedTitle: { fontSize: 20, fontWeight: "bold", color: brand.accent, letterSpacing: 4, marginBottom: 32 },
  summaryGrid: { flexDirection: "row", gap: 24, marginBottom: 48 },
  summaryItem: { alignItems: "center", backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 8, padding: 20, minWidth: 90 },
  summaryValue: { fontSize: 24, fontWeight: "bold", color: brand.text },
  summaryLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 3, marginTop: 4 },
  saveButton: { backgroundColor: brand.accent, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 4, marginBottom: 16 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 14, fontWeight: "700", color: brand.bg, letterSpacing: 2 },
  discardButton: { paddingVertical: 12 },
  discardButtonText: { fontSize: 12, color: brand.textDim, letterSpacing: 2 },

  // GPS Lost Banner
  gpsLostBanner: { backgroundColor: "#FF6B35", paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
  gpsLostText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  // Auto-Pause
  autoPauseText: { fontSize: 12, color: brand.textMuted, letterSpacing: 2, marginBottom: 8 },
});
