import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { brand } from "@/constants/Colors";

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

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={RotaDark}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: "fade" }} />
        <Stack.Screen name="register" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="activity/[id]"
          options={{ headerShown: true, headerTitle: "", headerBackTitle: "Geri", headerTintColor: brand.accent, headerStyle: { backgroundColor: brand.bg } }}
        />
      </Stack>
    </ThemeProvider>
  );
}
