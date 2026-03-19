import { getToken, clearToken } from "./auth";
import { getGlobalLogout } from "./auth-context";

// In development, use your local Alsancak Runners backend
// In production, use the deployed Vercel URL
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const REQUEST_TIMEOUT = 10_000; // 10 seconds

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Authenticated fetch wrapper for the Alsancak Runners API.
 * Automatically attaches JWT token, handles 401 responses with global logout,
 * and applies a 10s timeout.
 */
export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      // Also send as cookie for NextAuth compatibility
      headers["Cookie"] = `authjs.session-token=${token}`;
    }
  }

  const url = `${API_BASE}${path}`;

  // Timeout via AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401) {
      await clearToken();
      // Trigger global logout (redirect to login)
      const globalLogout = getGlobalLogout();
      if (globalLogout) globalLogout();
      throw new ApiError("Unauthorized", 401);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(
        body.error || `Request failed: ${response.status}`,
        response.status
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Typed API methods ──

export const API = {
  // Auth
  login: (email: string, password: string) =>
    api<{ token: string }>("/api/auth/callback/credentials", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Profile
  getProfile: () => api<{ member: Member }>("/api/members/me"),
  updateProfile: (data: Partial<Member>) =>
    api("/api/members/me", { method: "PATCH", body: JSON.stringify(data) }),

  // Activities
  getActivities: (page = 1, limit = 20) =>
    api<{ activities: Activity[]; hasMore: boolean }>(
      `/api/activities?page=${page}&limit=${limit}`
    ),
  getActivity: (id: string) =>
    api<{ activity: Activity; splits: Split[] }>(`/api/activities/${id}`),
  createActivity: (data: CreateActivityInput) =>
    api<{ id: string }>("/api/activities", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateActivity: (id: string, data: Partial<Activity>) =>
    api(`/api/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteActivity: (id: string) =>
    api(`/api/activities/${id}`, { method: "DELETE" }),

  // Community
  getCommunityActivities: (params: Record<string, string>) =>
    api<{ activities: CommunityActivity[]; total: number; hasMore: boolean }>(
      `/api/community/activities?${new URLSearchParams(params)}`
    ),
  getLeaderboard: (period = "month") =>
    api<{ leaderboard: LeaderboardEntry[] }>(
      `/api/community/leaderboard?period=${period}`
    ),
  getStats: () => api("/api/community/stats"),

  // Strava
  getStravaAuthUrl: () =>
    api<{ url: string }>("/api/strava/authorize?platform=mobile"),
  getStravaConnection: () => api("/api/strava/connection"),
  syncStrava: () =>
    api<{ synced: number }>("/api/strava/sync", { method: "POST" }),

  // Push
  registerPushToken: (token: string, platform: "ios" | "android") =>
    api("/api/members/me/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    }),

  // Events
  getEvents: () => api("/api/events"),
  rsvpEvent: (slug: string) =>
    api(`/api/events/${slug}/rsvp`, { method: "POST" }),
};

// ── Types ──

export interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
  instagram: string | null;
  paceGroup: string | null;
  bio: string | null;
  role: string;
  privacy: string;
}

export interface Activity {
  id: string;
  title: string;
  activityType: string;
  startTime: string;
  distanceM: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  elevationGainM: number | null;
  avgPaceSecKm: number | null;
  avgHeartrate: number | null;
  polylineEncoded: string | null;
  source: string;
}

export interface CreateActivityInput {
  title: string;
  distanceM: number;
  movingTimeSec: number;
  startTime: string;
  activityType?: string;
  polylineEncoded?: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  elevationGainM?: number;
}

export interface CommunityActivity {
  id: string;
  memberId: string;
  memberName: string;
  memberInitials: string;
  title: string;
  activityType: string;
  startTime: string;
  distanceM: number;
  movingTimeSec: number;
  avgPaceSecKm: number | null;
  polylineEncoded: string | null;
  startLat: number | null;
  startLng: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  totalRuns: number;
  totalDistanceKm: number;
  avgPaceSecKm: number;
}

export interface Split {
  splitIndex: number;
  distanceM: number;
  movingTimeSec: number;
  avgPaceSecKm: number;
  elevationDiffM: number | null;
  avgHeartrate: number | null;
}
