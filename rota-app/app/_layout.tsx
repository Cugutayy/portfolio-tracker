import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated]);

  // Keep splash visible while checking auth
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
        name="edit-profile"
        options={{
          animation: "slide_from_right",
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
