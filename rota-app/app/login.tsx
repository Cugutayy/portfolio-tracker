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
import { setToken } from "@/lib/auth";

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
    try {
      const res = await fetch(`${API_BASE}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, redirect: false, csrfToken: "" }),
      });

      const cookies = res.headers.get("set-cookie") || "";
      const tokenMatch = cookies.match(/(?:authjs\.session-token|__Secure-authjs\.session-token)=([^;]+)/);

      if (tokenMatch?.[1]) {
        await setToken(tokenMatch[1]);
        router.replace("/(tabs)");
      } else {
        Alert.alert("Hata", "Email veya sifre hatali");
      }
    } catch (err) {
      Alert.alert("Hata", "Baglanti saglanamadi. Lutfen tekrar deneyin.");
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
  link: { textAlign: "center", marginTop: 24, color: brand.textMuted, fontSize: 13 },
  linkAccent: { color: brand.accent },
});
