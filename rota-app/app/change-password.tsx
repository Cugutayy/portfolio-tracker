import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Hata", "Tum alanlari doldurun");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Hata", "Yeni sifre en az 8 karakter olmali");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Hata", "Yeni sifreler eslesmiyor");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Hata", "Yeni sifre mevcut sifreden farkli olmali");
      return;
    }

    setLoading(true);
    try {
      await API.changePassword(currentPassword, newPassword);
      Alert.alert(
        "Basarili",
        "Sifreniz guncellendi.",
        [
          {
            text: "Tamam",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (e: any) {
      Alert.alert("Hata", e.message || "Bir hata olustu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.container}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
            <Text style={s.backText}>Geri</Text>
          </TouchableOpacity>
          <Text style={s.title}>Sifre Degistir</Text>
          <View style={s.backButton} />
        </View>

        <Text style={s.description}>
          Sifrenizi degistirmek icin mevcut sifrenizi ve yeni sifrenizi girin.
        </Text>

        {/* Form */}
        <View style={s.form}>
          <View style={s.fieldGroup}>
            <Text style={s.label}>Mevcut Sifre</Text>
            <TextInput
              style={s.input}
              placeholder="Mevcut sifrenizi girin"
              placeholderTextColor={brand.textDim}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
          </View>

          <View style={s.divider} />

          <View style={s.fieldGroup}>
            <Text style={s.label}>Yeni Sifre</Text>
            <TextInput
              style={s.input}
              placeholder="En az 8 karakter"
              placeholderTextColor={brand.textDim}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>Yeni Sifre (Tekrar)</Text>
            <TextInput
              style={s.input}
              placeholder="Yeni sifrenizi tekrar girin"
              placeholderTextColor={brand.textDim}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleChange}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={brand.bg} />
            ) : (
              <Text style={s.buttonText}>SIFREYI GUNCELLE</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: brand.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: brand.text,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    color: brand.textMuted,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: brand.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    color: brand.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: brand.border,
    marginVertical: 8,
  },
  button: {
    backgroundColor: brand.accent,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: brand.bg,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
});
