import { getToken, clearToken, getRefreshToken, setToken, setRefreshToken } from "./auth";
import { getGlobalLogout } from "./auth-context";

// In development, use your local Alsancak Runners backend
// In production, use the deployed Vercel URL
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const REQUEST_TIMEOUT = 10_000; // 10 seconds
let _refreshing: Promise<boolean> | null = null;

/** Try to refresh the access token using the stored refresh token.
 *  Returns true if successful, false if refresh token is also expired. */
async function tryRefreshToken(): Promise<boolean> {
  // Prevent concurrent refresh attempts
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    try {
      const refresh = await getRefreshToken();
      if (!refresh) return false;

      const res = await fetch(`${API_BASE}/api/auth/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.accessToken) {
        await setToken(data.accessToken);
        if (data.refreshToken) await setRefreshToken(data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _refreshing = null;
    }
  })();

  return _refreshing;
}

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
      // Try refresh token before logout
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry the request with new token
        const newToken = await getToken();
        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
        }
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), REQUEST_TIMEOUT);
        try {
          const retryResponse = await fetch(url, { ...fetchOptions, headers, signal: retryController.signal });
          if (retryResponse.ok) {
            if (retryResponse.status === 204) return {} as T;
            return retryResponse.json();
          }
        } finally {
          clearTimeout(retryTimeout);
        }
      }
      // Refresh failed — full logout
      await clearToken();
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
  // Auth (mobile endpoint — login/register/refresh all use /api/auth/mobile)
  login: (email: string, password: string) =>
    api<{ accessToken: string; refreshToken: string; user: { id: string; name: string; email: string } }>(
      "/api/auth/mobile",
      { method: "POST", body: JSON.stringify({ email, password }), skipAuth: true }
    ),

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
  createEvent: (data: {
    title: string;
    description?: string | null;
    meetingPoint?: string | null;
    distanceM?: number | null;
    maxParticipants?: number | null;
    date: string;
    eventType?: string;
  }) => api("/api/events", { method: "POST", body: JSON.stringify(data) }),

  // Kudos
  getKudos: (activityId: string) =>
    api<KudosResponse>(`/api/activities/${activityId}/kudos`),
  toggleKudos: (activityId: string) =>
    api<{ action: string; count: number; hasKudosed: boolean }>(
      `/api/activities/${activityId}/kudos`,
      { method: "POST" }
    ),

  // Comments
  getComments: (activityId: string) =>
    api<{ comments: Comment[] }>(`/api/activities/${activityId}/comments`),
  addComment: (activityId: string, text: string) =>
    api<{ comment: Comment }>(`/api/activities/${activityId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  deleteComment: (activityId: string, commentId: string) =>
    api(`/api/activities/${activityId}/comments`, {
      method: "DELETE",
      body: JSON.stringify({ commentId }),
    }),

  // Member profiles
  getMemberProfile: (id: string) =>
    api<MemberProfile>(`/api/members/${id}`),
  toggleFollow: (id: string) =>
    api<{ action: string }>(`/api/members/${id}/follow`, { method: "POST" }),
  getFollowers: (memberId: string, type: "followers" | "following") =>
    api<{ users: Array<{ id: string; name: string; image: string | null; bio: string | null }> }>(
      `/api/members/${memberId}/followers?type=${type}`
    ),

  // Badges
  getBadges: () => api<{ badges: Badge[] }>("/api/badges"),
  getMyBadges: () =>
    api<{ badges: Array<{ badge: Badge; earnedAt: string }> }>(
      "/api/members/me/badges"
    ),

  // Invites
  createInvite: () =>
    api<{ code: string; deepLink: string; webLink: string }>("/api/invites", {
      method: "POST",
    }),

  // Settings
  updatePrivacy: (privacy: string) =>
    api("/api/members/me", {
      method: "PATCH",
      body: JSON.stringify({ privacy }),
    }),

  forgotPassword: (email: string) =>
    api<{ success: boolean; code?: string; message: string; expiresInMinutes: number }>(
      "/api/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }), skipAuth: true },
    ),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api<{ success: boolean; message: string }>(
      "/api/auth/reset-password",
      { method: "POST", body: JSON.stringify({ email, code, newPassword }), skipAuth: true },
    ),

  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ success: boolean; message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  deleteAccount: () =>
    api("/api/members/me", { method: "DELETE" }),

  logout: () =>
    api("/api/auth/logout", { method: "POST" }).catch(() => {}),
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
  memberId: string;
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
  memberName?: string | null;
  memberImage?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
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
  elapsedTimeSec?: number;
  photoBase64?: string;
  startLocation?: string;
  endLocation?: string;
  splits?: Array<{
    splitIndex: number;
    distanceM: number;
    movingTimeSec: number;
    avgPaceSecKm: number;
    elevationDiffM: number | null;
    avgHeartrate: number | null;
  }>;
}

export interface CommunityActivity {
  id: string;
  memberId: string;
  memberName: string;
  memberInitials: string;
  memberImage?: string | null;
  title: string;
  activityType: string;
  startTime: string;
  distanceM: number;
  movingTimeSec: number;
  avgPaceSecKm: number | null;
  polylineEncoded: string | null;
  startLat: number | null;
  startLng: number | null;
  kudosCount?: number;
  hasKudosed?: boolean;
  commentCount?: number;
  photoUrl?: string | null;
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

export interface KudosResponse {
  kudos: Array<{
    id: string;
    memberName: string;
    memberId: string;
    createdAt: string;
  }>;
  count: number;
  hasKudosed: boolean;
}

export interface Comment {
  id: string;
  text: string;
  memberName: string;
  memberImage: string | null;
  memberId: string;
  createdAt: string;
}

export interface MemberProfile {
  member: {
    id: string;
    name: string;
    image: string | null;
    bio: string | null;
    paceGroup: string | null;
  };
  stats: {
    totalRuns: number;
    totalDistanceM: number;
    avgPace: number;
  };
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconEmoji: string;
  category: string;
}
