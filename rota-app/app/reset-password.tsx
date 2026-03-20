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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

export default function ResetPasswordScreen() {
  const { email, code } = useLocalSearchParams<{
    email: string;
    code: string;
  }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Hata", "Tum alanlari doldurun");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Hata", "Sifre en az 8 karakter olmali");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Hata", "Sifreler eslesmiyor");
      return;
    }

    if (!email || !code) {
      Alert.alert("Hata", "Gecersiz sifirlama bilgileri. Lutfen tekrar deneyin.");
      router.replace("/forgot-password");
      return;
    }

    setLoading(true);
    try {
      await API.resetPassword(email, code, newPassword);
      Alert.alert(
        "Basarili",
        "Sifreniz guncellendi. Giris yapabilirsiniz.",
        [
          {
            text: "Giris Yap",
            onPress: () => router.replace("/login"),
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
      <View style={s.inner}>
        {/* Header */}
        <Text style={s.logo}>
          ROTA<Text style={s.logoDot}>.</Text>
        </Text>
        <Text style={s.title}>Yeni Sifre Belirle</Text>
        <Text style={s.description}>
          Yeni sifrenizi girin. En az 8 karakter olmali.
        </Text>

        {/* Form */}
        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Yeni sifre"
            placeholderTextColor={brand.textDim}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoFocus
          />
          <TextInput
            style={s.input}
            placeholder="Yeni sifre (tekrar)"
            placeholderTextColor={brand.textDim}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={brand.bg} />
            ) : (
              <Text style={s.buttonText}>SIFREYI GUNCELLE</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Back to login */}
        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={s.link}>
            <Text style={s.linkAccent}>Girise don</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logo: {
    fontSize: 48,
    fontWeight: "bold",
    color: brand.text,
    textAlign: "center",
    letterSpacing: 8,
  },
  logoDot: { color: brand.accent },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: brand.text,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: brand.textMuted,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  form: { gap: 12 },
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
  button: {
    backgroundColor: brand.accent,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: brand.bg,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
  link: {
    textAlign: "center",
    marginTop: 24,
    color: brand.textMuted,
    fontSize: 13,
  },
  linkAccent: { color: brand.accent },
});
