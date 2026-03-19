import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API } from "./api";

// Configure notification behavior for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request push notification permissions and register token with backend.
 * Returns the Expo push token or null if permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Register with backend
    const platform = Platform.OS === "ios" ? "ios" : "android";
    await API.registerPushToken(token, platform).catch(() => {
      // Non-critical — token will be registered on next launch
    });

    return token;
  } catch {
    return null;
  }
}
