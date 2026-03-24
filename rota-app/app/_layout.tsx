import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { brand } from "@/constants/Colors";
import { AuthProvider, useAuthContext } from "@/lib/auth-context";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

// Custom dark theme matching Alsancak Runners brand
const RotaDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: brand.accent,
    background: brand.bg,
    card: brand.surface,
    text: brand.text,
    border: brand.border,
    notification: brand.strava,
  },
};

function AuthGatedNavigation() {
  const { isLoading, isAuthenticated } = useAuthContext();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

  // Check onboarding flag
  useEffect(() => {
    AsyncStorage.getItem("hasSeenOnboarding").then((v) => {
      setHasSeenOnboarding(v === "1");
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoading && onboardingChecked) {
      if (!hasSeenOnboarding) {
        router.replace("/onboarding");
      } else if (!isAuthenticated) {
        router.replace("/login");
      }
    }
  }, [isLoading, isAuthenticated, onboardingChecked, hasSeenOnboarding]);

  // Keep splash visible while checking auth + onboarding
  useEffect(() => {
    if (!isLoading && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, onboardingChecked]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="login" options={{ animation: "fade" }} />
      <Stack.Screen name="register" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="strava-callback" options={{ animation: "fade" }} />
      <Stack.Screen
        name="import-activity"
        options={{
          animation: "slide_from_bottom",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="activity/[id]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
        }}
      />
      <Stack.Screen
        name="member/[id]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
        }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
        }}
      />
      <Stack.Screen
        name="event/[slug]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
        }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="settings"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="change-password"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="reset-password"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="group/[slug]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
        }}
      />
      <Stack.Screen
        name="create-group"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
      <Stack.Screen
        name="group-settings"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="search"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="create-event"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
      <Stack.Screen
        name="create-post"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
      <Stack.Screen
        name="followers"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Geri",
          headerTintColor: brand.accent,
          headerStyle: { backgroundColor: brand.bg },
        }}
      />
      <Stack.Screen
        name="invite"
        options={{
          animation: "slide_from_bottom",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={RotaDark}>
      <AuthProvider>
        <AuthGatedNavigation />
      </AuthProvider>
    </ThemeProvider>
  );
}
