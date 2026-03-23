import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import {
  API,
  type Post,
  type KudosResponse,
  type Comment,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { useAuthContext } from "@/lib/auth-context";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthContext();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kudos state
  const [kudosData, setKudosData] = useState<KudosResponse>({ kudos: [], count: 0, hasKudosed: false });
  const [showAllKudos, setShowAllKudos] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const data = await API.getPost(id);
      setPost(data.post);
      // Backend returns kudos as array directly, not KudosResponse shape
      if (Array.isArray(data.kudos)) {
        setKudosData({
          kudos: data.kudos,
          count: data.kudos.length,
          hasKudosed: data.post?.hasKudosed ?? false,
        });
      } else if (data.kudos) {
        setKudosData(data.kudos);
      }
      if (data.comments) {
        setComments(Array.isArray(data.comments) ? data.comments : []);
      }
    } catch (err: unknown) {
      console.error("Post fetch error:", err);
      setError((err as Error).message || "Gonderi yuklenemedi");
    }
    // Also load kudos and comments separately as fallback
    API.getPostKudos(id).then((res) => {
      if (res) setKudosData(res);
    }).catch(() => {});
    API.getPostComments(id).then((res) => {
      if (res?.comments) setComments(res.comments);
    }).catch(() => {});
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
      await API.togglePostKudos(id);
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
      const res = await API.addPostComment(id, commentText.trim());
      setComments((prev) => [...prev, res.comment]);
      setCommentText("");
    } catch {
      Alert.alert("Hata", "Yorum gonderilemedi.");
    } finally {
      setSendingComment(false);
    }
  }, [id, commentText]);

  const handleDeletePost = useCallback(async () => {
    if (!id) return;
    Alert.alert("Gonderiyi Sil", "Bu gonderiyi silmek istediginize emin misiniz?", [
      { text: "Iptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await API.deletePost(id);
            router.back();
          } catch {
            Alert.alert("Hata", "Gonderi silinemedi.");
          }
        },
      },
    ]);
  }, [id]);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator color={brand.accent} size="large" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.errorText}>{error || "Gonderi bulunamadi"}</Text>
      </View>
    );
  }

  const photos = [post.photoUrl, post.photoUrl2, post.photoUrl3].filter(Boolean) as string[];
  const isOwnPost = user?.id === post.memberId;
  const allKudos = kudosData.kudos || [];
  const visibleKudos = showAllKudos ? allKudos : allKudos.slice(0, 3);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: brand.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          headerRight: isOwnPost
            ? () => (
                <TouchableOpacity onPress={handleDeletePost} hitSlop={8} style={{ justifyContent: "center", alignItems: "center", paddingRight: 4 }}>
                  <Ionicons name="trash-outline" size={20} color="#FF5252" />
                </TouchableOpacity>
              )
            : undefined,
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
        {/* Member + Time */}
        <TouchableOpacity
          style={s.memberRow}
          onPress={() => router.push(`/member/${post.memberId}` as never)}
          activeOpacity={0.7}
        >
          <View style={s.memberAvatar}>
            {post.memberImage ? (
              <Image source={{ uri: post.memberImage }} style={s.memberAvatarImage} />
            ) : (
              <Text style={s.memberAvatarText}>
                {(post.memberName || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.memberName}>{post.memberName}</Text>
            <Text style={s.timeText}>{formatRelativeTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        {/* Post Text */}
        {post.text && (
          <Text style={s.postText}>{post.text}</Text>
        )}

        {/* Photos */}
        {photos.length === 1 && (
          <View style={s.photosSection}>
            <Image source={{ uri: photos[0] }} style={s.singlePhoto} resizeMode="cover" />
          </View>
        )}
        {photos.length > 1 && (
          <View style={s.photosSection}>
            <View style={s.multiPhotoRow}>
              {photos.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={s.multiPhotoThumb} resizeMode="cover" />
              ))}
            </View>
          </View>
        )}

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
              <TouchableOpacity
                onPress={() => router.push(`/member/${c.memberId}` as never)}
                activeOpacity={0.7}
              >
                <View style={s.commentAvatar}>
                  {c.memberImage ? (
                    <Image source={{ uri: c.memberImage }} style={s.commentAvatarImage} />
                  ) : (
                    <Text style={s.commentAvatarText}>
                      {(c.memberName || "?").split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              <View style={s.commentBody}>
                <View style={s.commentMeta}>
                  <TouchableOpacity
                    onPress={() => router.push(`/member/${c.memberId}` as never)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.commentName}>{c.memberName}</Text>
                  </TouchableOpacity>
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
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  content: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brand.bg },
  errorText: { color: brand.textMuted, fontSize: 15 },

  memberRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, justifyContent: "center", alignItems: "center" },
  memberAvatarImage: { width: 38, height: 38, borderRadius: 19 },
  memberAvatarText: { fontSize: 13, fontWeight: "bold", color: brand.accent },
  memberName: { fontSize: 15, fontWeight: "600", color: brand.text },
  timeText: { fontSize: 12, color: brand.textDim, marginTop: 2 },

  postText: { fontSize: 16, color: brand.text, lineHeight: 22, paddingHorizontal: 20, paddingTop: 16 },

  photosSection: { marginHorizontal: 20, marginTop: 12 },
  singlePhoto: { width: "100%", height: 300, borderRadius: 8, backgroundColor: brand.surface },
  multiPhotoRow: { flexDirection: "row", gap: 6 },
  multiPhotoThumb: { flex: 1, height: 200, borderRadius: 8, backgroundColor: brand.surface },

  // Kudos
  kudosSection: { marginHorizontal: 20, marginTop: 16, marginBottom: 16, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 4, padding: 16 },
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
  sectionTitle: { fontSize: 11, color: brand.textMuted, letterSpacing: 3, fontWeight: "600", marginBottom: 12 },
  noComments: { fontSize: 13, color: brand.textDim, textAlign: "center", paddingVertical: 12 },
  commentItem: { flexDirection: "row", gap: 10, marginBottom: 12 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: brand.elevated, alignItems: "center", justifyContent: "center" },
  commentAvatarImage: { width: 28, height: 28, borderRadius: 14 },
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
});
