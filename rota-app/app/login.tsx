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
import { router } from "expo-router";
import { brand } from "@/constants/Colors";
import { setToken, setUser, setRefreshToken } from "@/lib/auth";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Hata", "Email ve sifre gerekli");
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE}/api/auth/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Hata", data.error || "Giris yapilamadi");
        return;
      }

      // Store tokens + user data
      await setToken(data.accessToken || data.token);
      if (data.refreshToken) await setRefreshToken(data.refreshToken);
      if (data.user) await setUser(data.user);
      router.replace("/(tabs)");
    } catch (e: any) {
      clearTimeout(timeout);
      if (e.name === "AbortError") {
        Alert.alert("Hata", "Baglanti zaman asimina ugradi. Internet baglantinizi kontrol edin.");
      } else {
        Alert.alert("Hata", "Baglanti saglanamadi. Lutfen tekrar deneyin.");
      }
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
        {/* Logo */}
        <Text style={s.logo}>
          ROTA<Text style={s.logoDot}>.</Text>
        </Text>
        <Text style={s.subtitle}>Kosu Toplulugu</Text>

        {/* Form */}
        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={brand.textDim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={s.input}
            placeholder="Sifre"
            placeholderTextColor={brand.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={brand.bg} />
            ) : (
              <Text style={s.buttonText}>GIRIS YAP</Text>
            )}
          </TouchableOpacity>

          {/* Forgot password link */}
          <TouchableOpacity
            onPress={() => router.push("/forgot-password")}
            style={s.forgotButton}
          >
            <Text style={s.forgotText}>Sifremi Unuttum</Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={s.link}>
            Hesabin yok mu?{" "}
            <Text style={s.linkAccent}>Kayit ol</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logo: { fontSize: 48, fontWeight: "bold", color: brand.text, textAlign: "center", letterSpacing: 8 },
  logoDot: { color: brand.accent },
  subtitle: { fontSize: 12, color: brand.textMuted, textAlign: "center", letterSpacing: 4, textTransform: "uppercase", marginTop: 4, marginBottom: 48 },
  form: { gap: 12 },
  input: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, color: brand.text, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 4 },
  button: { backgroundColor: brand.accent, paddingVertical: 16, borderRadius: 4, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: brand.bg, fontSize: 13, fontWeight: "700", letterSpacing: 2 },
  forgotButton: { alignItems: "center" as const, marginTop: 4 },
  forgotText: { color: brand.textMuted, fontSize: 13, textDecorationLine: "underline" as const },
  link: { textAlign: "center" as const, marginTop: 24, color: brand.textMuted, fontSize: 13 },
  linkAccent: { color: brand.accent },
});
