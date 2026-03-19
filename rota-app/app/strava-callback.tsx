import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { brand } from "@/constants/Colors";

export default function StravaCallbackScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(tabs)/profile");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const isSuccess = status === "connected";
  const message = isSuccess
    ? "Strava hesabin basariyla baglandi!"
    : status === "denied"
      ? "Strava erisimi reddedildi."
      : status === "already_linked"
        ? "Bu Strava hesabi baska bir kullaniciya bagli."
        : "Strava baglantisinda bir hata olustu.";

  return (
    <View style={s.container}>
      <Text style={s.icon}>{isSuccess ? "✓" : "✗"}</Text>
      <Text style={[s.title, isSuccess && s.titleSuccess]}>
        {isSuccess ? "BAGLANDI" : "HATA"}
      </Text>
      <Text style={s.message}>{message}</Text>
      <ActivityIndicator
        color={brand.textDim}
        size="small"
        style={s.loader}
      />
      <Text style={s.redirect}>Profile yonlendiriliyor...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  icon: {
    fontSize: 48,
    color: brand.accent,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: brand.text,
    letterSpacing: 4,
    marginBottom: 12,
  },
  titleSuccess: {
    color: brand.accent,
  },
  message: {
    fontSize: 14,
    color: brand.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  loader: {
    marginTop: 32,
  },
  redirect: {
    fontSize: 11,
    color: brand.textDim,
    marginTop: 8,
  },
});
