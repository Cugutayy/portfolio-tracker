import { useMemo, useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";
import { API } from "@/lib/api";

const STEPS = [
  {
    key: "track_reliably",
    title: "Guvenilir Takip",
    body: "GPS sinyali ve tempo kalitesi takip edilerek kosular daha guvenilir kaydedilir.",
    icon: "pulse-outline" as const,
  },
  {
    key: "run_with_community",
    title: "Toplulukla Kos",
    body: "Kulup hedefleri, feed ve etkinliklerle motivasyonunu toplulukla birlikte koru.",
    icon: "people-outline" as const,
  },
  {
    key: "share_safely",
    title: "Guvenli Paylasim",
    body: "Gorunurluk seviyeni sec: private / members / public. Konum guvenligi once gelir.",
    icon: "shield-checkmark-outline" as const,
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const step = useMemo(() => STEPS[index], [index]);
  const isLast = index === STEPS.length - 1;

  const handleNext = async () => {
    setSubmitting(true);
    try {
      await API.trackOnboardingEvent("onboarding_screen_viewed", {
        step: step.key,
        position: index + 1,
      });
    } catch {}
    setSubmitting(false);

    if (isLast) {
      router.replace("/(tabs)");
      return;
    }
    setIndex((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const handleSkip = async () => {
    try {
      await API.trackOnboardingEvent("onboarding_screen_viewed", {
        step: step.key,
        skipped: true,
      });
    } catch {}
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.brand}>ROTA.</Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={s.skip}>Gec</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <View style={s.iconWrap}>
          <Ionicons name={step.icon} size={40} color={brand.accent} />
        </View>
        <Text style={s.title}>{step.title}</Text>
        <Text style={s.body}>{step.body}</Text>

        <View style={s.dots}>
          {STEPS.map((s2, i) => (
            <View key={s2.key} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>
      </View>

      <TouchableOpacity style={[s.cta, submitting && { opacity: 0.7 }]} onPress={handleNext} disabled={submitting}>
        <Text style={s.ctaText}>{isLast ? "Basla" : "Devam"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg, padding: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  brand: { color: brand.text, fontSize: 22, fontWeight: "900" },
  skip: { color: brand.textDim, fontSize: 14, fontWeight: "700" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#1B1B1E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: { color: brand.text, fontSize: 26, fontWeight: "900", textAlign: "center" },
  body: { color: brand.textDim, fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 22, paddingHorizontal: 12 },
  dots: { flexDirection: "row", gap: 8, marginTop: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#444" },
  dotActive: { width: 22, backgroundColor: brand.accent },
  cta: {
    backgroundColor: brand.accent,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ctaText: { color: brand.bg, fontSize: 16, fontWeight: "900" },
});
