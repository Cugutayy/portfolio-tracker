import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

interface FollowUser {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  isOnline?: boolean;
}

export default function FollowersScreen() {
  const { memberId, type } = useLocalSearchParams<{ memberId: string; type: string }>();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getFollowers(memberId, type as "followers" | "following");
      setUsers(data.users || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [memberId, type]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const renderUser = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity
      style={s.userRow}
      onPress={() => router.push(`/member/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {item.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
        </Text>
        <View style={[s.onlineDot, { backgroundColor: item.isOnline ? "#4CAF50" : "#666" }]} />
      </View>
      <View style={s.userInfo}>
        <Text style={s.userName}>{item.name}</Text>
        {item.bio && <Text style={s.userBio} numberOfLines={1}>{item.bio}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="arrow-back" size={18} color={brand.accent} />
          <Text style={s.backBtn}> Geri</Text>
        </TouchableOpacity>
        <Text style={s.title}>{type === "followers" ? "TAKIPCILER" : "TAKIP EDILENLER"}</Text>
        <View style={{ width: 50 }} />
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={brand.accent} style={{ marginTop: 40 }} />
          ) : (
            <Text style={s.emptyText}>
              {type === "followers" ? "Henuz takipci yok" : "Henuz kimse takip edilmiyor"}
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: brand.border },
  backBtn: { fontSize: 14, color: brand.accent },
  title: { fontSize: 13, fontWeight: "bold", color: brand.text, letterSpacing: 3 },
  list: { padding: 16 },
  userRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: brand.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: "bold", color: brand.accent },
  onlineDot: { position: "absolute" as const, bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: brand.bg },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "600", color: brand.text },
  userBio: { fontSize: 12, color: brand.textDim, marginTop: 2 },
  emptyText: { fontSize: 13, color: brand.textDim, textAlign: "center", marginTop: 40 },
});
