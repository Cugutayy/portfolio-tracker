import { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { CATEGORIES, type EventCategory } from "@/constants/categories";
import { API, type NearbyEvent, type Venue } from "@/lib/api";

const MAP_HTML = require("@/assets/map.html");

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  ["pk.eyJ1IjoiY2FnYXRheXl5IiwiYSI6ImNtb", "XdzaGJyNTJwYm0ycnF4eXBkaWk1bnIifQ", ".mQzIAMv0hs23D4rUb3_5gQ"].join("");

const RADIUS_OPTIONS = [1, 3, 5, 10] as const;

export default function MapHomeScreen() {
  const webviewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [eventCount, setEventCount] = useState(0);

  const pendingData = useRef<{ events?: NearbyEvent[]; venues?: Venue[] }>({});

  const sendToMap = useCallback((type: string, data: unknown) => {
    webviewRef.current?.postMessage(JSON.stringify({ type, data }));
  }, []);

  // Send pending data once map is ready
  useEffect(() => {
    if (!mapReady) return;
    if (pendingData.current.events) {
      sendToMap("setEvents", pendingData.current.events);
      pendingData.current.events = undefined;
    }
    if (pendingData.current.venues) {
      sendToMap("setVenues", pendingData.current.venues);
      pendingData.current.venues = undefined;
    }
  }, [mapReady, sendToMap]);

  // Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // Default to Alsancak, Izmir
        setUserLat(38.4337);
        setUserLng(27.1428);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
    })();
  }, []);

  // Send user location to map
  useEffect(() => {
    if (mapReady && userLat && userLng) {
      sendToMap("setUserLocation", { lat: userLat, lng: userLng });
    }
  }, [mapReady, userLat, userLng, sendToMap]);

  // Fetch nearby data when location/filters change
  useEffect(() => {
    if (!userLat || !userLng) return;
    let cancelled = false;
    setLoading(true);

    // Try nearby endpoint first, fallback to regular events list
    const fetchEvents = async () => {
      try {
        const res = await API.getNearbyEvents({ lat: userLat!, lng: userLng!, radiusKm, category: selectedCategory || undefined });
        return res.events || [];
      } catch {
        // Fallback: use regular events endpoint (for backends without /nearby)
        try {
          const res = await API.getEvents() as any;
          // Map meetingLat/meetingLng to lat/lng for the map, skip events without coords
          return (res.events || [])
            .map((e: any) => ({
              ...e,
              lat: e.lat || e.meetingLat || null,
              lng: e.lng || e.meetingLng || null,
            }))
            .filter((e: any) => e.lat && e.lng);
        } catch { return []; }
      }
    };

    const fetchVenues = async () => {
      try {
        const res = await API.getNearbyVenues({ lat: userLat!, lng: userLng!, radiusKm });
        return res.venues || [];
      } catch { return []; }
    };

    Promise.allSettled([fetchEvents(), fetchVenues()]).then(([evRes, venRes]) => {
      if (cancelled) return;
      const events = evRes.status === "fulfilled" ? evRes.value : [];
      const venues = venRes.status === "fulfilled" ? venRes.value : [];
      setEventCount(events.length);

      if (mapReady) {
        sendToMap("setEvents", events);
        sendToMap("setVenues", venues);
      } else {
        pendingData.current = { events, venues };
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userLat, userLng, radiusKm, selectedCategory, mapReady, sendToMap]);

  // Filter category on map
  useEffect(() => {
    if (mapReady) {
      sendToMap("filterCategory", selectedCategory);
    }
  }, [selectedCategory, mapReady, sendToMap]);

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "mapReady") setMapReady(true);
      if (msg.type === "visibleCount") setEventCount(msg.count);
      if (msg.type === "joinEvent" && msg.slug) {
        API.toggleRSVP(msg.slug).catch(() => {});
        router.push(`/event/${msg.slug}` as never);
      }
    } catch {}
  }, []);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.title}>ROTA</Text>
          <View style={s.headerRight}>
            {loading && <ActivityIndicator color={brand.accent} size="small" />}
            {!loading && eventCount > 0 && (
              <Text style={s.count}>{eventCount} etkinlik</Text>
            )}
            <TouchableOpacity onPress={() => router.push("/search" as never)} hitSlop={8}>
              <Ionicons name="search-outline" size={20} color={brand.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
          <TouchableOpacity
            style={[s.filterBtn, !selectedCategory && s.filterActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[s.filterText, !selectedCategory && s.filterTextActive]}>Tumu</Text>
          </TouchableOpacity>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[s.filterBtn, selectedCategory === c.key && { borderColor: c.color, backgroundColor: c.color + "18" }]}
              onPress={() => setSelectedCategory(selectedCategory === c.key ? null : c.key)}
            >
              <Ionicons name={c.icon as any} size={14} color={selectedCategory === c.key ? c.color : brand.textMuted} />
              <Text style={[s.filterText, selectedCategory === c.key && { color: c.color }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Radius pills */}
        <View style={s.radiusRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[s.radiusPill, radiusKm === r && s.radiusPillActive]}
              onPress={() => setRadiusKm(r)}
            >
              <Text style={[s.radiusText, radiusKm === r && s.radiusTextActive]}>{r} km</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Map */}
      <View style={s.mapWrapper}>
        {mapError ? (
          <View style={s.mapError}>
            <Ionicons name="map-outline" size={48} color={brand.textDim} />
            <Text style={s.mapErrorText}>Harita yuklenemedi</Text>
            <TouchableOpacity onPress={() => setMapError(false)} style={s.retryBtn}>
              <Text style={s.retryText}>TEKRAR DENE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={MAP_HTML}
            style={s.webview}
            onMessage={onMessage}
            onError={() => setMapError(true)}
            onHttpError={() => setMapError(true)}
            injectedJavaScriptBeforeContentLoaded={`window.__MAPBOX_TOKEN__="${MAPBOX_TOKEN}";true;`}
            onLoadEnd={() => { if (!mapReady) sendToMap("setToken", MAPBOX_TOKEN); }}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            originWhitelist={["*"]}
            mixedContentMode="always"
          />
        )}
      </View>

      {/* FAB — Create Event */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push("/create-event" as never)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* Quick action — Start Run */}
      <TouchableOpacity
        style={s.runFab}
        onPress={() => router.push("/track" as never)}
        activeOpacity={0.8}
      >
        <Ionicons name="fitness-outline" size={20} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 8, paddingHorizontal: 4,
  },
  title: { fontSize: 18, fontWeight: "900", color: brand.text, letterSpacing: 4 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  count: { fontSize: 12, color: brand.textMuted },

  filterScroll: { marginBottom: 6 },
  filterContent: { gap: 6, paddingHorizontal: 4 },
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: brand.border, backgroundColor: brand.surface,
  },
  filterActive: { borderColor: brand.accent, backgroundColor: brand.accentDim },
  filterText: { fontSize: 11, fontWeight: "600", color: brand.textMuted, letterSpacing: 0.5 },
  filterTextActive: { color: brand.accent },

  radiusRow: { flexDirection: "row", gap: 6, paddingHorizontal: 4, marginBottom: 2 },
  radiusPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, borderColor: brand.border,
  },
  radiusPillActive: { borderColor: brand.accent, backgroundColor: brand.accentDim },
  radiusText: { fontSize: 10, fontWeight: "600", color: brand.textDim },
  radiusTextActive: { color: brand.accent },

  mapWrapper: {
    flex: 1, margin: 6, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: brand.border,
  },
  webview: { flex: 1, backgroundColor: brand.bg },
  mapError: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brand.surface, gap: 12 },
  mapErrorText: { fontSize: 14, color: brand.textMuted },
  retryBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: brand.accent, borderRadius: 8,
  },
  retryText: { fontSize: 11, fontWeight: "700", color: brand.accent, letterSpacing: 1 },

  fab: {
    position: "absolute", bottom: 110, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: brand.accent, alignItems: "center", justifyContent: "center",
    shadowColor: brand.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  runFab: {
    position: "absolute", bottom: 110, left: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center",
    shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
});
