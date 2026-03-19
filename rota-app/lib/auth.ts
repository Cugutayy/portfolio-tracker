import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rota_session_token";
const REFRESH_KEY = "rota_refresh_token";
const USER_KEY = "rota_user";

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
}

/** Store user profile data locally */
export async function setUser(user: { id: string; name: string; email: string }): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

/** Get cached user profile */
export async function getUser(): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Check if user is logged in */
export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
