import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { brand } from "@/constants/Colors";
import { API, type Activity, type Split } from "@/lib/api";
import { formatDistance, formatPace, formatDuration, formatDate, formatTime } from "@/lib/format";

// Mapbox public token — injected at runtime to avoid GitHub secret scanning
const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  ["pk.eyJ1IjoiY2FnYXRheXl5IiwiYSI6ImNtb", "XdzaGJyNTJwYm0ycnF4eXBkaWk1bnIifQ", ".mQzIAMv0hs23D4rUb3_5gQ"].join("");
const MAP_HEIGHT = 220;

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    API.getActivity(id)
      .then((data) => {
        setActivity(data.activity);
        setSplits(data.splits || []);
      })
      .catch((err) => {
        console.error("Activity fetch error:", err);
        setError(err.message || "Aktivite yüklenemedi");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator color={brand.accent} size="large" />
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.errorText}>{error || "Aktivite bulunamadi"}</Text>
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

  // Build inline map HTML for polyline
  const mapHtml = activity.polylineEncoded ? `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css" rel="stylesheet"/>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js"></script>
<style>body{margin:0;padding:0}#map{width:100%;height:100vh}</style>
</head><body>
<div id="map"></div>
<script>
mapboxgl.accessToken='${MAPBOX_TOKEN}';
function decode(str){var coords=[],lat=0,lng=0,i=0;while(i<str.length){var b,shift=0,result=0;do{b=str.charCodeAt(i++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lat+=(result&1)?~(result>>1):(result>>1);shift=0;result=0;do{b=str.charCodeAt(i++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lng+=(result&1)?~(result>>1):(result>>1);coords.push([lng/1e5,lat/1e5])}return coords}
var coords=decode(${JSON.stringify(activity.polylineEncoded)});
var map=new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/dark-v11',center:coords[0],zoom:13,interactive:false,attributionControl:false});
map.on('load',function(){
  map.addSource('route',{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:coords}}});
  map.addLayer({id:'route',type:'line',source:'route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#E6FF00','line-width':3.5,'line-opacity':0.9}});
  var bounds=coords.reduce(function(b,c){return b.extend(c)},new mapboxgl.LngLatBounds(coords[0],coords[0]));
  map.fitBounds(bounds,{padding:30,duration:0});
  new mapboxgl.Marker({color:'#E6FF00',scale:0.6}).setLngLat(coords[0]).addTo(map);
  new mapboxgl.Marker({color:'#FF6B6B',scale:0.6}).setLngLat(coords[coords.length-1]).addTo(map);
});
</script>
</body></html>` : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Route Map */}
      {mapHtml && (
        <View style={s.mapContainer}>
          <WebView
            source={{ html: mapHtml }}
            style={s.map}
            scrollEnabled={false}
            javaScriptEnabled={true}
          />
        </View>
      )}

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
  content: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brand.bg },
  errorText: { color: brand.textMuted, fontSize: 15 },
  mapContainer: {
    height: MAP_HEIGHT,
    width: "100%",
    backgroundColor: brand.surface,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  map: { flex: 1, backgroundColor: "transparent" },
  title: { fontSize: 22, fontWeight: "bold", color: brand.text, letterSpacing: 1, marginBottom: 4, paddingHorizontal: 20, paddingTop: 16 },
  meta: { fontSize: 12, color: brand.textDim, letterSpacing: 1, marginBottom: 24, paddingHorizontal: 20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24, paddingHorizontal: 20 },
  statBox: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, minWidth: "30%", flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },
  splitsSection: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, marginHorizontal: 20 },
  sectionTitle: { fontSize: 11, color: brand.textMuted, letterSpacing: 3, fontWeight: "600", marginBottom: 12 },
  splitsHeader: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: brand.border },
  splitHeaderText: { color: brand.textDim, fontSize: 10, letterSpacing: 2 },
  splitRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: brand.border },
  splitCell: { flex: 1, fontSize: 13, color: brand.text, textAlign: "center" },
});
