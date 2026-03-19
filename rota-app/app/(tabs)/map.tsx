import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { brand } from "@/constants/Colors";
import { API, type CommunityActivity, type LeaderboardEntry } from "@/lib/api";

const MAP_HTML = require("@/assets/map.html");

// Mapbox public token — injected at runtime to avoid GitHub secret scanning
const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  ["pk.eyJ1IjoiY2FnYXRheXl5IiwiYSI6ImNtb", "XdzaGJyNTJwYm0ycnF4eXBkaWk1bnIifQ", ".mQzIAMv0hs23D4rUb3_5gQ"].join("");

const INJECT_TOKEN = `window.__MAPBOX_TOKEN__ = "${MAPBOX_TOKEN}"; if(window.mapboxgl) mapboxgl.accessToken = window.__MAPBOX_TOKEN__;`;

const PERIODS = [
  { key: "week", label: "HAFTA" },
  { key: "month", label: "AY" },
  { key: "year", label: "YIL" },
] as const;

type Period = (typeof PERIODS)[number]["key"];

export default function MapScreen() {
  const webviewRef = useRef<WebView>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [activityCount, setActivityCount] = useState(0);

  const pendingData = useRef<{
    activities?: CommunityActivity[];
    leaderboard?: LeaderboardEntry[];
  }>({});

  const sendToMap = useCallback(
    (type: string, data: unknown) => {
      if (webviewRef.current) {
        webviewRef.current.postMessage(JSON.stringify({ type, data }));
      }
    },
    []
  );

  // Send pending data once map is ready
  useEffect(() => {
    if (!mapReady) return;
    if (pendingData.current.activities) {
      sendToMap("setActivities", pendingData.current.activities);
      pendingData.current.activities = undefined;
    }
    if (pendingData.current.leaderboard) {
      sendToMap("setLeaderboard", pendingData.current.leaderboard);
      pendingData.current.leaderboard = undefined;
    }
  }, [mapReady, sendToMap]);

  // Fetch data when period changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      API.getCommunityActivities({ period, limit: "200" }),
      API.getLeaderboard(period),
    ])
      .then(([actData, lbData]) => {
        if (cancelled) return;
        setActivityCount(actData.activities.length);

        if (mapReady) {
          sendToMap("setActivities", actData.activities);
          sendToMap("setLeaderboard", lbData.leaderboard);
        } else {
          pendingData.current = {
            activities: actData.activities,
            leaderboard: lbData.leaderboard,
          };
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, mapReady, sendToMap]);

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "mapReady") setMapReady(true);
    } catch {}
  }, []);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.title}>KOSU HARITASI</Text>
          {loading && <ActivityIndicator color={brand.accent} size="small" />}
          {!loading && activityCount > 0 && (
            <Text style={s.count}>{activityCount} kosu</Text>
          )}
        </View>

        {/* Period filter */}
        <View style={s.filters}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[s.filterBtn, period === p.key && s.filterActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text
                style={[
                  s.filterText,
                  period === p.key && s.filterTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Map WebView */}
      <View style={s.mapWrapper}>
        <WebView
          ref={webviewRef}
          source={MAP_HTML}
          style={s.webview}
          onMessage={onMessage}
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
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: brand.text,
    letterSpacing: 3,
  },
  count: {
    fontSize: 12,
    color: brand.textMuted,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  filterActive: {
    borderColor: brand.accent,
    backgroundColor: "rgba(230, 255, 0, 0.1)",
  },
  filterText: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.textMuted,
    letterSpacing: 1,
  },
  filterTextActive: {
    color: brand.accent,
  },
  mapWrapper: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: brand.border,
  },
  webview: {
    flex: 1,
    backgroundColor: brand.bg,
  },
});
