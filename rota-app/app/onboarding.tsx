import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";

const { width: SCREEN_W } = Dimensions.get("window");

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: "navigate-outline",
    title: "Guvenle Takip Et",
    subtitle: "GPS ile kosuyu kaydet",
    description:
      "Kosu baslat, rotani haritada gor, tempo ve mesafeni anlik takip et. Tum veriler telefonunda guvenle saklanir.",
  },
  {
    icon: "people-outline",
    title: "Toplulukla Kos",
    subtitle: "Birlikte daha eglenceli",
    description:
      "Gruplara katil, etkinliklere RSVP ver, arkadaslarinin kosularini gor. Kudos gonder, yorum yap, motive ol.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Guvenle Paylas",
    subtitle: "Gizlilik senin elinde",
    description:
      "Kosularini kimlerin gorecegini sec: herkes, sadece uyeler veya gizli. Baslangic/bitis noktani koruyoruz.",
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      await AsyncStorage.setItem("hasSeenOnboarding", "1");
      router.replace("/login");
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "1");
    router.replace("/login");
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={[st.slide, { width: SCREEN_W }]}>
      <View style={st.iconContainer}>
        <View style={st.iconCircle}>
          <Ionicons name={item.icon} size={48} color={brand.accent} />
        </View>
        <Text style={st.stepIndicator}>{index + 1} / {SLIDES.length}</Text>
      </View>
      <Text style={st.title}>{item.title}</Text>
      <Text style={st.subtitle}>{item.subtitle}</Text>
      <Text style={st.description}>{item.description}</Text>
    </View>
  );

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={st.container}>
      <View style={st.topBar}>
        <View style={{ width: 60 }} />
        <Text style={st.logo}>ROTA<Text style={{ color: brand.accent }}>.</Text></Text>
        {!isLast ? (
          <TouchableOpacity onPress={handleSkip} hitSlop={8}>
            <Text style={st.skipText}>Atla</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setActiveIndex(idx);
        }}
      />

      {/* Dots */}
      <View style={st.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: "clamp",
          });
          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={i}
              style={[st.dot, { width: dotWidth, opacity: dotOpacity }]}
            />
          );
        })}
      </View>

      {/* CTA */}
      <View style={st.bottomSection}>
        <TouchableOpacity style={st.ctaButton} onPress={handleNext} activeOpacity={0.8}>
          <Text style={st.ctaText}>{isLast ? "BASLAYALIM" : "DEVAM"}</Text>
          <Ionicons name={isLast ? "checkmark" : "arrow-forward"} size={18} color={brand.bg} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logo: { fontSize: 20, fontWeight: "bold", color: brand.text, letterSpacing: 4 },
  skipText: { fontSize: 14, color: brand.textDim, fontWeight: "500", width: 60, textAlign: "right" },

  slide: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  iconContainer: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(230,255,0,0.08)",
    borderWidth: 2,
    borderColor: "rgba(230,255,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  stepIndicator: { fontSize: 12, color: brand.textDim, letterSpacing: 2 },
  title: { fontSize: 26, fontWeight: "800", color: brand.text, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, color: brand.accent, fontWeight: "600", textAlign: "center", marginBottom: 16, letterSpacing: 1 },
  description: { fontSize: 14, color: brand.textMuted, textAlign: "center", lineHeight: 22 },

  dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 24 },
  dot: { height: 4, borderRadius: 2, backgroundColor: brand.accent },

  bottomSection: { paddingHorizontal: 24, paddingBottom: 32 },
  ctaButton: {
    flexDirection: "row",
    backgroundColor: brand.accent,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  ctaText: { fontSize: 15, fontWeight: "700", color: brand.bg, letterSpacing: 2 },
});
