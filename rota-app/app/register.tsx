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
import { setToken, setUser } from "@/lib/auth";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Hata", "Tum alanlar gerekli");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Hata", "Sifre en az 8 karakter olmali");
      return;
    }

    setLoading(true);
    try {
      // Unified endpoint: name present = register + auto-login
      const res = await fetch(`${API_BASE}/api/auth/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Hata", data.error || "Kayit basarisiz");
        return;
      }

      // Auto-login: token comes back immediately
      await setToken(data.token);
      if (data.user) {
        await setUser(data.user);
      }
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Hata", "Baglanti saglanamadi");
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
        <Text style={s.title}>KAYIT OL</Text>
        <Text style={s.subtitle}>Kosu toplulugumuza katil</Text>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Isim"
            placeholderTextColor={brand.textDim}
            value={name}
            onChangeText={setName}
          />
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
            placeholder="Sifre (min 8 karakter)"
            placeholderTextColor={brand.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={brand.bg} />
            ) : (
              <Text style={s.buttonText}>KAYIT OL</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.link}>
            Zaten hesabin var mi?{" "}
            <Text style={s.linkAccent}>Giris yap</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  title: { fontSize: 28, fontWeight: "bold", color: brand.text, textAlign: "center", letterSpacing: 4 },
  subtitle: { fontSize: 12, color: brand.textMuted, textAlign: "center", letterSpacing: 2, marginTop: 4, marginBottom: 48 },
  form: { gap: 12 },
  input: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, color: brand.text, fontSize: 15, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 4 },
  button: { backgroundColor: brand.accent, paddingVertical: 16, borderRadius: 4, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: brand.bg, fontSize: 13, fontWeight: "700", letterSpacing: 2 },
  link: { textAlign: "center", marginTop: 24, color: brand.textMuted, fontSize: 13 },
  linkAccent: { color: brand.accent },
});
