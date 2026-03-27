import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import { formatRelativeTime, getInitials } from "@/lib/format";

interface Notification {
  id: string;
  type: "kudos" | "comment" | "follow" | "event_rsvp" | "challenge" | "pr" | "system";
  actorName: string;
  actorImage: string | null;
  message: string;
  targetId: string | null;
  targetType: string | null;
  read: boolean;
  createdAt: string;
}

const ICON_MAP: Record<string, { name: string; color: string }> = {
  kudos: { name: "heart", color: "#FF6B6B" },
  comment: { name: "chatbubble", color: "#4ECDC4" },
  follow: { name: "person-add", color: "#45B7D1" },
  event_rsvp: { name: "calendar", color: "#96CEB4" },
  challenge: { name: "trophy", color: "#FFD700" },
  pr: { name: "medal", color: "#FF6B35" },
  system: { name: "notifications", color: brand.accent },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await API.getNotifications() as { notifications: Notification[] };
      setNotifications(res.notifications || []);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  const handlePress = (n: Notification) => {
    if (n.targetType === "activity" && n.targetId) router.push(`/activity/${n.targetId}` as never);
    else if (n.targetType === "post" && n.targetId) router.push(`/post/${n.targetId}` as never);
    else if (n.targetType === "member" && n.targetId) router.push(`/member/${n.targetId}` as never);
    else if (n.targetType === "event" && n.targetId) router.push(`/event/${n.targetId}` as never);
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = ICON_MAP[item.type] || ICON_MAP.system;
    return (
      <TouchableOpacity
        style={[s.notifRow, !item.read && s.notifUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={s.avatarWrap}>
          {item.actorImage ? (
            <Image source={{ uri: item.actorImage }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitials}>{getInitials(item.actorName)}</Text>
            </View>
          )}
          <View style={[s.typeBadge, { backgroundColor: icon.color }]}>
            <Ionicons name={icon.name as any} size={10} color="#FFF" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.notifText}>
            <Text style={s.notifActor}>{item.actorName}</Text>{" "}
            {item.message}
          </Text>
          <Text style={s.notifTime}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={s.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={brand.text} />
        </TouchableOpacity>
        <Text style={s.title}>BILDIRIMLER</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={brand.accent} style={{ marginTop: 40 }} /> : (
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={brand.textDim} />
              <Text style={s.emptyTitle}>Henuz bildirim yok</Text>
              <Text style={s.emptyDesc}>Biri kosuna kudos verdiginde veya yorum yaptiginda burada gorunecek.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: brand.border,
  },
  title: { fontSize: 14, fontWeight: "700", color: brand.text, letterSpacing: 3 },
  list: { paddingVertical: 8 },
  notifRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: brand.border,
  },
  notifUnread: { backgroundColor: brand.accent + "08" },
  avatarWrap: { position: "relative" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: brand.surface,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.border,
  },
  avatarInitials: { fontSize: 14, fontWeight: "700", color: brand.accent },
  typeBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: brand.bg,
  },
  notifText: { fontSize: 14, color: brand.text, lineHeight: 20 },
  notifActor: { fontWeight: "700" },
  notifTime: { fontSize: 12, color: brand.textDim, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: brand.accent },
  empty: { alignItems: "center", padding: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: brand.text },
  emptyDesc: { fontSize: 13, color: brand.textDim, textAlign: "center", lineHeight: 20, maxWidth: 280 },
});
