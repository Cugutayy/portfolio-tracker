import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { router } from "expo-router";
import { getToken, clearToken, setToken, setUser, getUser } from "./auth";
import { API, type Member } from "./api";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: Member | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

/** Global logout callback — set by AuthProvider, called by api.ts on 401 */
let _globalLogout: (() => Promise<void>) | null = null;
export function getGlobalLogout() {
  return _globalLogout;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUserState] = useState<Member | null>(null);

  const logout = useCallback(async () => {
    await clearToken();
    setIsAuthenticated(false);
    setUserState(null);
    router.replace("/login");
  }, []);

  // Register global logout for 401 handler
  useEffect(() => {
    _globalLogout = logout;
    return () => {
      _globalLogout = null;
    };
  }, [logout]);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await API.getProfile();
      const member = (data as { member: Member }).member || data;
      setUserState(member as Member);
      await setUser({ id: member.id, name: member.name, email: member.email });
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(
    async (token: string) => {
      await setToken(token);
      setIsAuthenticated(true);
      await refreshProfile();
    },
    [refreshProfile],
  );

  // Check auth on mount
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await API.getProfile();
        const member = (data as { member: Member }).member || data;
        setUserState(member as Member);
        await setUser({ id: member.id, name: member.name, email: member.email });
        setIsAuthenticated(true);
      } catch {
        const cached = await getUser();
        if (cached) {
          setIsAuthenticated(true);
        } else {
          await clearToken();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoading, isAuthenticated, user, login, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
