import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { getToken, clearToken, setToken, setUser, getUser } from "@/lib/auth";
import { API, type Member } from "@/lib/api";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUserState] = useState<Member | null>(null);

  const checkAuth = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const resp = await API.getProfile();
      const member = (resp as unknown as { id: string; name: string; email: string });
      setUserState(member as unknown as Member);
      await setUser({ id: member.id, name: member.name, email: member.email });
      setIsAuthenticated(true);
    } catch {
      // Token invalid — try cached user
      const cached = await getUser();
      if (cached) {
        setIsAuthenticated(true);
      } else {
        await clearToken();
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    // Call the credentials login endpoint
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/members/join`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: email.split("@")[0] }),
      }
    );

    // Try to get a session by signing in
    const signInRes = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          redirect: false,
          csrfToken: "",
        }),
      }
    );

    // Extract session token from cookies
    const cookies = signInRes.headers.get("set-cookie") || "";
    const tokenMatch = cookies.match(/authjs\.session-token=([^;]+)/);
    const token = tokenMatch?.[1];

    if (!token) {
      throw new Error("Login failed");
    }

    await setToken(token);
    setIsAuthenticated(true);
    router.replace("/(tabs)");
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setIsAuthenticated(false);
    setUserState(null);
    router.replace("/login");
  }, []);

  return { isLoading, isAuthenticated, user, login, logout, checkAuth };
}
