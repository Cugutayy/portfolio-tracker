import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { getToken, clearToken, setToken, setRefreshToken, setUser, getUser } from "@/lib/auth";
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
      const member = resp.member;
      setUserState(member as Member);
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
    const res = await API.login(email, password);

    await setToken(res.accessToken);
    await setRefreshToken(res.refreshToken);
    await setUser({ id: res.user.id, name: res.user.name, email: res.user.email });

    setUserState(res.user as unknown as Member);
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
