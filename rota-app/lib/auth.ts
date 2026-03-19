import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rota_session_token";
const USER_KEY = "rota_user";

/**
 * Store the JWT session token securely on device.
 * Uses Keychain (iOS) / Keystore (Android).
 */
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Retrieve the stored JWT session token.
 */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear the stored session token (logout).
 */
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

/**
 * Store user profile data locally for quick access.
 */
export async function setUser(user: { id: string; name: string; email: string }): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

/**
 * Get cached user profile.
 */
export async function getUser(): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Check if user is logged in (has a token).
 */
export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
