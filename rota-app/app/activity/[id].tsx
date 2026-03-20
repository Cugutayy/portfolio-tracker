import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { WebView } from "react-native-webview";
import * as Sharing from "expo-sharing";
import { brand } from "@/constants/Colors";
import {
  API,
  type Activity,
  type Split,
  type KudosResponse,
  type Comment,
} from "@/lib/api";
import {
  formatDistance,
  formatPace,
  formatDuration,
  formatDate,
  formatTime,
  formatRelativeTime,
} from "@/lib/format";
import ShareCard, { type ShareCardRef } from "@/components/ShareCard";

// Mapbox public token
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

  // Kudos state
  const [kudosData, setKudosData] = useState<KudosResponse>({ kudos: [], count: 0, hasKudosed: false });
  const [showAllKudos, setShowAllKudos] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Share card ref
  const shareCardRef = useRef<ShareCardRef>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const data = await API.getActivity(id);
      setActivity(data.activity);
      setSplits(data.splits || []);
    } catch (err: unknown) {
      console.error("Activity fetch error:", err);
      setError((err as Error).message || "Aktivite yuklenemedi");
    }
    // Load kudos and comments (non-blocking)
    API.getKudos(id).then(setKudosData).catch(() => {});
    API.getComments(id).then((res) => setComments(res.comments)).catch(() => {});
  }, [id]);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleToggleKudos = useCallback(async () => {
    if (!id) return;
    const originalHasKudosed = kudosData.hasKudosed;
    const originalCount = kudosData.count;

    // Optimistic update
    setKudosData((prev) => ({
      ...prev,
      hasKudosed: !prev.hasKudosed,
      count: prev.count + (prev.hasKudosed ? -1 : 1),
    }));
    try {
      await API.toggleKudos(id);
    } catch {
      // Revert to original
      setKudosData((prev) => ({
        ...prev,
        hasKudosed: originalHasKudosed,
        count: originalCount,
      }));
    }
  }, [id, kudosData.hasKudosed, kudosData.count]);

  const handleSendComment = useCallback(async () => {
    if (!id || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const res = await API.addComment(id, commentText.trim());
      setComments((prev) => [...prev, res.comment]);
      setCommentText("");
    } catch {
      Alert.alert("Hata", "Yorum gonderilemedi.");
    } finally {
      setSendingComment(false);
    }
  }, [id, commentText]);

  const handleShare = useCallback(async () => {
    if (!shareCardRef.current) return;
    try {
      const uri = await shareCardRef.current.capture();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
      }
    } catch {
      Alert.alert("Hata", "Paylasim basarisiz.");
    }
  }, []);

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

  const visibleKudos = showAllKudos ? kudosData.kudos : kudosData.kudos.slice(0, 3);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: brand.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} hitSlop={8} style={{ justifyContent: "center", alignItems: "center", paddingRight: 4 }}>
              <Text style={{ fontSize: 13, color: brand.accent, fontWeight: "700", letterSpacing: 1 }}>
                PAYLAS
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} />
        }
      >
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

        {/* Member + Title + Meta */}
        {activity.memberName && (
          <TouchableOpacity
            style={s.memberRow}
            onPress={() => router.push(`/member/${activity.memberId}` as never)}
            activeOpacity={0.7}
          >
            <View style={s.memberAvatar}>
              {activity.memberImage ? (
                <Image source={{ uri: activity.memberImage }} style={s.memberAvatarImage} />
              ) : (
                <Text style={s.memberAvatarText}>
                  {activity.memberName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </Text>
              )}
            </View>
            <Text style={s.memberName}>{activity.memberName}</Text>
          </TouchableOpacity>
        )}
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
        {splits.length > 0 && (() => {
          const paceValues = splits.map(sp => sp.avgPaceSecKm).filter(Boolean) as number[];
          const minPace = Math.min(...paceValues);
          const maxPace = Math.max(...paceValues);
          function getSplitColor(pace: number, mn: number, mx: number): string {
            if (mx === mn) return "transparent";
            const ratio = (pace - mn) / (mx - mn);
            if (ratio < 0.3) return "rgba(76, 175, 80, 0.15)";
            if (ratio < 0.7) return "transparent";
            return "rgba(255, 82, 82, 0.15)";
          }
          return (
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
              <View key={split.splitIndex} style={[s.splitRow, { backgroundColor: split.avgPaceSecKm ? getSplitColor(split.avgPaceSecKm, minPace, maxPace) : "transparent" }]}>
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
            {splits.length > 1 && (
              <View style={s.splitLegend}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: "rgba(76, 175, 80, 0.4)" }]} />
                  <Text style={s.legendText}>Hizli</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: "rgba(255, 82, 82, 0.4)" }]} />
                  <Text style={s.legendText}>Yavas</Text>
                </View>
              </View>
            )}
          </View>
          );
        })()}

        {/* Kudos Section */}
        <View style={s.kudosSection}>
          <View style={s.kudosRow}>
            <TouchableOpacity style={s.kudosButton} onPress={handleToggleKudos}>
              <Text style={[s.kudosEmoji, kudosData.hasKudosed && s.kudosActiveEmoji]}>
                {"\uD83D\uDC4F"}
              </Text>
            </TouchableOpacity>
            <Text style={s.kudosCount}>{kudosData.count}</Text>
            <Text style={s.kudosLabel}>kudos</Text>
          </View>
          {visibleKudos.length > 0 && (
            <View style={s.kudosNames}>
              {visibleKudos.map((k) => (
                <Text key={k.id} style={s.kudosName}>{k.memberName}</Text>
              ))}
              {!showAllKudos && kudosData.kudos.length > 3 && (
                <TouchableOpacity onPress={() => setShowAllKudos(true)}>
                  <Text style={s.kudosMore}>+{kudosData.kudos.length - 3} daha</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Comments Section */}
        <View style={s.commentsSection}>
          <Text style={s.sectionTitle}>YORUMLAR</Text>
          {comments.length === 0 && (
            <Text style={s.noComments}>Henuz yorum yok</Text>
          )}
          {comments.map((c) => (
            <View key={c.id} style={s.commentItem}>
              <View style={s.commentAvatar}>
                <Text style={s.commentAvatarText}>
                  {c.memberName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </Text>
              </View>
              <View style={s.commentBody}>
                <View style={s.commentMeta}>
                  <Text style={s.commentName}>{c.memberName}</Text>
                  <Text style={s.commentTime}>{formatRelativeTime(c.createdAt)}</Text>
                </View>
                <Text style={s.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}

          {/* Comment Input */}
          <View style={s.commentInputRow}>
            <TextInput
              style={s.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Yorum yaz..."
              placeholderTextColor={brand.textDim}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendButton, (!commentText.trim() || sendingComment) && s.sendButtonDisabled]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || sendingComment}
            >
              <Text style={s.sendButtonText}>
                {sendingComment ? "..." : "GONDER"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Hidden share card for capture */}
      <View style={s.shareCardHidden}>
        <ShareCard
          ref={shareCardRef}
          title={activity.title}
          distanceM={activity.distanceM}
          avgPaceSecKm={activity.avgPaceSecKm}
          movingTimeSec={activity.movingTimeSec}
          startTime={activity.startTime}
          activityType={activity.activityType}
          polylineEncoded={activity.polylineEncoded}
        />
      </View>
    </KeyboardAvoidingView>
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
  memberRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, justifyContent: "center", alignItems: "center" },
  memberAvatarImage: { width: 34, height: 34, borderRadius: 17 },
  memberAvatarText: { fontSize: 12, fontWeight: "bold", color: brand.accent },
  memberName: { fontSize: 14, fontWeight: "600", color: brand.text },
  title: { fontSize: 22, fontWeight: "bold", color: brand.text, letterSpacing: 1, marginBottom: 4, paddingHorizontal: 20, paddingTop: 16 },
  meta: { fontSize: 12, color: brand.textDim, letterSpacing: 1, marginBottom: 24, paddingHorizontal: 20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24, paddingHorizontal: 20 },
  statBox: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, minWidth: "30%", flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: brand.text },
  statLabel: { fontSize: 9, color: brand.textDim, letterSpacing: 2, marginTop: 4 },
  splitsSection: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16, marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: brand.textMuted, letterSpacing: 3, fontWeight: "600", marginBottom: 12 },
  splitsHeader: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: brand.border },
  splitHeaderText: { color: brand.textDim, fontSize: 10, letterSpacing: 2 },
  splitRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: brand.border },
  splitCell: { flex: 1, fontSize: 13, color: brand.text, textAlign: "center" },
  splitLegend: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 8, marginBottom: 0 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: brand.textDim },

  // Kudos
  kudosSection: { marginHorizontal: 20, marginBottom: 16, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16 },
  kudosRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kudosButton: { padding: 4 },
  kudosEmoji: { fontSize: 24, opacity: 0.6 },
  kudosActiveEmoji: { opacity: 1 },
  kudosCount: { fontSize: 18, fontWeight: "bold", color: brand.text },
  kudosLabel: { fontSize: 13, color: brand.textMuted },
  kudosNames: { marginTop: 8, gap: 2 },
  kudosName: { fontSize: 12, color: brand.textDim },
  kudosMore: { fontSize: 12, color: brand.accent, marginTop: 2 },

  // Comments
  commentsSection: { marginHorizontal: 20, marginBottom: 16, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16 },
  noComments: { fontSize: 13, color: brand.textDim, textAlign: "center", paddingVertical: 12 },
  commentItem: { flexDirection: "row", gap: 10, marginBottom: 12 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  commentAvatarText: { fontSize: 10, color: brand.accent, fontWeight: "600" },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  commentName: { fontSize: 12, color: brand.text, fontWeight: "600" },
  commentTime: { fontSize: 10, color: brand.textDim },
  commentText: { fontSize: 13, color: brand.text, lineHeight: 18 },
  commentInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: brand.border, paddingTop: 12 },
  commentInput: { flex: 1, backgroundColor: brand.elevated, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, color: brand.text, fontSize: 13, maxHeight: 80 },
  sendButton: { backgroundColor: brand.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4 },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { fontSize: 11, fontWeight: "700", color: brand.bg, letterSpacing: 1 },

  // Hidden share card
  shareCardHidden: { position: "absolute", left: -9999, top: -9999 },
});
