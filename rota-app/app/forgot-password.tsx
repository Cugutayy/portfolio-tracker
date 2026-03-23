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
import { API } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Hata", "Email adresi gerekli");
      return;
    }

    setLoading(true);
    try {
      await API.forgotPassword(trimmed);
      setStep("code");
      Alert.alert(
        "Kod Gonderildi",
        "Kodunuz email adresinize gonderildi",
      );
    } catch (e: any) {
      Alert.alert("Hata", e.message || "Bir hata olustu");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length !== 6) {
      Alert.alert("Hata", "6 haneli kodu girin");
      return;
    }

    // Navigate to reset-password with email and code
    router.push({
      pathname: "/reset-password",
      params: { email: email.trim().toLowerCase(), code: trimmedCode },
    });
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
        <Text style={s.title}>Sifremi Unuttum</Text>
        <Text style={s.description}>
          {step === "email"
            ? "Hesabiniza bagli email adresini girin."
            : "Email adresinize gonderilen 6 haneli kodu girin."}
        </Text>

        {/* Form */}
        <View style={s.form}>
          {step === "email" ? (
            <>
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor={brand.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />

              <TouchableOpacity
                style={[s.button, loading && s.buttonDisabled]}
                onPress={handleRequestCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={brand.bg} />
                ) : (
                  <Text style={s.buttonText}>KOD GONDER</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={s.input}
                placeholder="6 haneli kod"
                placeholderTextColor={brand.textDim}
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={[s.button, loading && s.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                <Text style={s.buttonText}>DEVAM ET</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.resendButton}
                onPress={() => {
                  setCode("");
                  handleRequestCode();
                }}
                disabled={loading}
              >
                <Text style={s.resendText}>Kodu tekrar gonder</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Back to login */}
        <TouchableOpacity onPress={() => router.back()}>
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
    textAlign: "center",
    letterSpacing: 2,
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
  resendButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resendText: {
    color: brand.textMuted,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  link: {
    textAlign: "center",
    marginTop: 24,
    color: brand.textMuted,
    fontSize: 13,
  },
  linkAccent: { color: brand.accent },
});
