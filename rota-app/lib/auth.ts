import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "rota_session_token";
const REFRESH_KEY = "rota_refresh_token";
const USER_KEY = "rota_user";
const USER_IMAGE_KEY = "rota_user_image";

/** Store access token */
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/** Get access token */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Store refresh token */
export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

/** Get refresh token */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

/** Clear all tokens (logout) */
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  AsyncStorage.removeItem(USER_IMAGE_KEY).catch(() => {});
}

/** Store user profile data locally (image stored separately in AsyncStorage for size) */
export async function setUser(user: { id: string; name: string; email: string; image?: string | null }): Promise<void> {
  const { image, ...basic } = user;
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(basic));
  // Store large base64 image in AsyncStorage (no size limit)
  if (image) {
    AsyncStorage.setItem(USER_IMAGE_KEY, image).catch(() => {});
  } else {
    AsyncStorage.removeItem(USER_IMAGE_KEY).catch(() => {});
  }
}

/** Get cached user profile (with image from AsyncStorage) */
export async function getUser(): Promise<{ id: string; name: string; email: string; image?: string | null } | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    // Load cached image (non-blocking, may be null)
    const image = await AsyncStorage.getItem(USER_IMAGE_KEY).catch(() => null);
    return { ...user, image };
  } catch {
    return null;
  }
}

/** Check if user is logged in */
export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
