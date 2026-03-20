import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

// ── Storage keys ──
const UNIT_KEY = "unit_preference";
const AUTO_PAUSE_KEY = "auto_pause";
const NOTIF_KEY = "notification_prefs";

type PrivacyLevel = "everyone" | "members" | "private";

const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string }[] = [
  { value: "everyone", label: "Herkes" },
  { value: "members", label: "Üyeler" },
  { value: "private", label: "Gizli" },
];

interface NotificationPrefs {
  kudos: boolean;
  comments: boolean;
  events: boolean;
}

const DEFAULT_NOTIF: NotificationPrefs = {
  kudos: true,
  comments: true,
  events: true,
};

export default function SettingsScreen() {
  const { logout, user } = useAuthContext();

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [unitKm, setUnitKm] = useState(true);
  const [autoPause, setAutoPause] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIF);
  const [privacy, setPrivacy] = useState<PrivacyLevel>("members");
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // ── Load saved preferences ──
  useEffect(() => {
    (async () => {
      try {
        const [unitVal, pauseVal, notifVal] = await Promise.all([
          AsyncStorage.getItem(UNIT_KEY),
          AsyncStorage.getItem(AUTO_PAUSE_KEY),
          AsyncStorage.getItem(NOTIF_KEY),
        ]);

        if (unitVal !== null) setUnitKm(unitVal === "km");
        if (pauseVal !== null) setAutoPause(pauseVal === "true");
        if (notifVal !== null) {
          try {
            setNotifPrefs({ ...DEFAULT_NOTIF, ...JSON.parse(notifVal) });
          } catch {
            // ignore malformed JSON
          }
        }

        // Load privacy from user profile
        if (user?.privacy) {
          setPrivacy(user.privacy as PrivacyLevel);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ── Persistence helpers ──
  const toggleUnit = useCallback(async (val: boolean) => {
    const isKm = !val; // Switch: off=km, on=mi → invert for storage
    setUnitKm(!val);
    await AsyncStorage.setItem(UNIT_KEY, !val ? "km" : "mi");
  }, []);

  const toggleAutoPause = useCallback(async (val: boolean) => {
    setAutoPause(val);
    await AsyncStorage.setItem(AUTO_PAUSE_KEY, String(val));
  }, []);

  const updateNotifPref = useCallback(
    async (key: keyof NotificationPrefs, val: boolean) => {
      const updated = { ...notifPrefs, [key]: val };
      setNotifPrefs(updated);
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
    },
    [notifPrefs]
  );

  const handlePrivacyChange = useCallback(
    async (level: PrivacyLevel) => {
      if (level === privacy) return;
      setSavingPrivacy(true);
      try {
        await API.updatePrivacy(level);
        setPrivacy(level);
      } catch {
        Alert.alert("Hata", "Gizlilik ayarı güncellenemedi.");
      } finally {
        setSavingPrivacy(false);
      }
    },
    [privacy]
  );

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Hesabı Sil",
      "Hesabınız ve tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabı Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await API.deleteAccount();
              await logout();
            } catch {
              Alert.alert("Hata", "Hesap silinemedi. Lütfen tekrar deneyin.");
            }
          },
        },
      ]
    );
  }, [logout]);

  const handleLogout = useCallback(() => {
    Alert.alert("Çıkış Yap", "Çıkış yapmak istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          try {
            await API.logout();
          } finally {
            await logout();
          }
        },
      },
    ]);
  }, [logout]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={brand.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={brand.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profil ── */}
        <Text style={styles.sectionHeader}>PROFİL</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/edit-profile")}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="person-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Profili Düzenle</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={brand.textDim} />
          </TouchableOpacity>
        </View>

        {/* ── Tercihler ── */}
        <Text style={styles.sectionHeader}>TERCİHLER</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="speedometer-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Birim</Text>
            </View>
            <View style={styles.unitToggle}>
              <Text style={[styles.unitLabel, unitKm && styles.unitLabelActive]}>
                km
              </Text>
              <Switch
                value={!unitKm}
                onValueChange={toggleUnit}
                trackColor={{ false: brand.border, true: brand.border }}
                thumbColor={brand.accent}
                style={styles.switch}
              />
              <Text style={[styles.unitLabel, !unitKm && styles.unitLabelActive]}>
                mi
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="pause-circle-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Otomatik Duraklatma</Text>
            </View>
            <Switch
              value={autoPause}
              onValueChange={toggleAutoPause}
              trackColor={{ false: brand.border, true: brand.accent }}
              thumbColor={autoPause ? brand.bg : brand.textMuted}
              style={styles.switch}
            />
          </View>
        </View>

        {/* ── Bildirimler ── */}
        <Text style={styles.sectionHeader}>BİLDİRİMLER</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="heart-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Kudos Bildirimi</Text>
            </View>
            <Switch
              value={notifPrefs.kudos}
              onValueChange={(v) => updateNotifPref("kudos", v)}
              trackColor={{ false: brand.border, true: brand.accent }}
              thumbColor={notifPrefs.kudos ? brand.bg : brand.textMuted}
              style={styles.switch}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="chatbubble-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Yorum Bildirimi</Text>
            </View>
            <Switch
              value={notifPrefs.comments}
              onValueChange={(v) => updateNotifPref("comments", v)}
              trackColor={{ false: brand.border, true: brand.accent }}
              thumbColor={notifPrefs.comments ? brand.bg : brand.textMuted}
              style={styles.switch}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="calendar-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Etkinlik Bildirimi</Text>
            </View>
            <Switch
              value={notifPrefs.events}
              onValueChange={(v) => updateNotifPref("events", v)}
              trackColor={{ false: brand.border, true: brand.accent }}
              thumbColor={notifPrefs.events ? brand.bg : brand.textMuted}
              style={styles.switch}
            />
          </View>
        </View>

        {/* ── Gizlilik ── */}
        <Text style={styles.sectionHeader}>GİZLİLİK</Text>
        <View style={styles.section}>
          <View style={styles.privacyRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="shield-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Profil Gizliliği</Text>
            </View>
            {savingPrivacy && (
              <ActivityIndicator
                size="small"
                color={brand.accent}
                style={{ marginRight: 8 }}
              />
            )}
          </View>
          <View style={styles.privacyOptions}>
            {PRIVACY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.privacyChip,
                  privacy === opt.value && styles.privacyChipActive,
                ]}
                onPress={() => handlePrivacyChange(opt.value)}
                activeOpacity={0.7}
                disabled={savingPrivacy}
              >
                <Text
                  style={[
                    styles.privacyChipText,
                    privacy === opt.value && styles.privacyChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Hesap ── */}
        <Text style={styles.sectionHeader}>HESAP</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/change-password")}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="key-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Şifre Değiştir</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={brand.textDim} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
              <Text style={[styles.rowLabel, { color: "#FF4444" }]}>
                Hesabı Sil
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="log-out-outline" size={20} color="#FF4444" />
              <Text style={[styles.rowLabel, { color: "#FF4444" }]}>
                Çıkış Yap
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Hakkında ── */}
        <Text style={styles.sectionHeader}>HAKKINDA</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={20} color={brand.textMuted} />
              <Text style={styles.rowLabel}>Versiyon</Text>
            </View>
            <Text style={styles.versionText}>1.0.0</Text>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.bg,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: brand.bg,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: brand.text,
  },
  headerSpacer: {
    width: 36,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Sections
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.textDim,
    letterSpacing: 3,
    marginBottom: 8,
    marginTop: 24,
    marginLeft: 4,
  },
  section: {
    backgroundColor: brand.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: "hidden",
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: brand.text,
  },
  divider: {
    height: 1,
    backgroundColor: brand.border,
    marginLeft: 48,
  },

  // Unit toggle
  unitToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unitLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.textDim,
  },
  unitLabelActive: {
    color: brand.accent,
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },

  // Privacy
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  privacyOptions: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    paddingTop: 12,
  },
  privacyChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: brand.elevated,
    borderWidth: 1,
    borderColor: brand.border,
    alignItems: "center",
  },
  privacyChipActive: {
    borderColor: brand.accent,
    backgroundColor: "rgba(230, 255, 0, 0.08)",
  },
  privacyChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: brand.textMuted,
  },
  privacyChipTextActive: {
    color: brand.accent,
    fontWeight: "600",
  },

  // Version
  versionText: {
    fontSize: 14,
    color: brand.textDim,
  },
});
