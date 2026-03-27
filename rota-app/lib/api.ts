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
  getStats: () => api<{ members: number; totalRuns: number; totalDistanceKm: number }>("/api/community/stats"),

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
  getEvents: (params?: Record<string, string>) =>
    api(`/api/events${params ? `?${new URLSearchParams(params)}` : ""}`),
  getEventDetail: (slug: string) =>
    api<{ event: any; rsvps: Array<{ id: string; memberName: string; memberImage: string | null; paceGroup: string | null; status: string }> }>(
      `/api/events/${slug}`
    ),
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

  // Groups
  getMyGroups: () => api<{ groups: Group[] }>("/api/groups/my"),
  getGroups: (params: Record<string, string>) => api<{ groups: Group[]; hasMore: boolean }>(`/api/groups?${new URLSearchParams(params)}`),
  createGroup: (data: { name: string; description?: string; image?: string; sportType?: string; city?: string; visibility?: string }) => api<{ group: { id: string; slug: string; name: string } }>("/api/groups", { method: "POST", body: JSON.stringify(data) }),
  getGroup: (slug: string) => api<{ group: Group; stats: { totalMembers: number; totalRunsThisMonth: number; totalDistanceMThisMonth: number } }>(`/api/groups/${slug}`),
  joinGroup: (slug: string, code?: string) => api(`/api/groups/${slug}/join`, { method: "POST", body: JSON.stringify({ code }) }),
  leaveGroup: (slug: string) => api(`/api/groups/${slug}/leave`, { method: "POST" }),
  getGroupMembers: (slug: string) => api<{ members: Array<{ id: string; name: string; image: string | null; role: string; isOnline: boolean }> }>(`/api/groups/${slug}/members`),
  getGroupFeed: (slug: string, params: Record<string, string>) => api<{ feed: Array<{ type: string; id: string; memberId: string; memberName: string; memberImage: string | null; text?: string | null; photoUrl?: string | null; distanceM?: number; movingTimeSec?: number; avgPaceSecKm?: number | null; createdAt: string; kudosCount: number; commentCount: number }>; hasMore: boolean }>(`/api/groups/${slug}/feed?${new URLSearchParams(params)}`),
  getGroupLeaderboard: (slug: string, period?: string) => api<{ leaderboard: LeaderboardEntry[] }>(`/api/groups/${slug}/leaderboard?period=${period || 'month'}`),
  updateGroup: (slug: string, data: { name?: string; description?: string | null; image?: string | null; sportType?: string; city?: string | null; visibility?: string }) =>
    api(`/api/groups/${slug}`, { method: "PATCH", body: JSON.stringify(data) }),
  createGroupInvite: (slug: string) => api<{ code: string }>(`/api/groups/${slug}/invite`, { method: "POST" }),

  // Weekly goals
  getWeeklyGoal: () => api<WeeklyGoalResponse>("/api/members/me/goals"),
  updateWeeklyGoal: (data: { distanceGoalM?: number; runsGoal?: number }) =>
    api("/api/members/me/goals", { method: "PATCH", body: JSON.stringify(data) }),

  // Personal Records
  getMyRecords: () => api<{ records: PersonalRecord[] }>("/api/members/me/records"),
  getMemberRecords: (id: string) => api<{ records: PersonalRecord[] }>(`/api/members/${id}/records`),

  // Weekly History (12-week trend)
  getWeeklyHistory: () => api<{
    weeks: Array<{ weekStart: string; totalDistanceM: number; totalTimeSec: number; totalElevationM: number; runCount: number }>;
    currentMonth: { name: string; totalDistanceM: number; totalTimeSec: number; runCount: number; streak: number; streakActivities: number };
  }>("/api/members/me/weekly-history"),

  // Calendar
  getCalendar: (month?: string) => api<{ days: Array<{ date: string; count: number; totalDistanceM: number }>; month: string }>(`/api/members/me/calendar${month ? `?month=${month}` : ""}`),

  // Challenges
  getChallenges: (status?: string) => api<{ challenges: unknown[] }>(`/api/challenges${status ? `?status=${status}` : ""}`),
  getChallenge: (id: string) => api<{ challenge: unknown; leaderboard: unknown[]; hasJoined: boolean; myProgress: number | null }>(`/api/challenges/${id}`),
  joinChallenge: (id: string) => api(`/api/challenges/${id}`, { method: "POST" }),
  createChallenge: (data: { title: string; description?: string; type: string; goalValue: number; startDate: string; endDate: string; groupId?: string }) => api<{ id: string }>("/api/challenges", { method: "POST", body: JSON.stringify(data) }),

  // Suggestions
  getFollowSuggestions: () => api<{ suggestions: Array<{ id: string; name: string; image: string | null; bio: string | null; paceGroup: string | null; activityCount: number }> }>("/api/members/suggestions"),

  // Search
  search: (q: string, type?: string) => api<{ members: Array<{ id: string; name: string; image: string | null }>; groups: Group[]; events: Array<{ id: string; title: string; slug: string; date: string }> }>(`/api/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`),

  // Posts
  getPosts: (params: Record<string, string>) =>
    api<{ posts: Post[]; hasMore: boolean }>(
      `/api/posts?${new URLSearchParams(params)}`
    ),
  createPost: (data: { text?: string; photoBase64?: string; photoBase64_2?: string; photoBase64_3?: string }) =>
    api<{ id: string }>("/api/posts", { method: "POST", body: JSON.stringify(data) }),
  getPost: (id: string) =>
    api<{ post: Post; kudos: KudosResponse; comments: Comment[] }>(`/api/posts/${id}`),
  deletePost: (id: string) =>
    api(`/api/posts/${id}`, { method: "DELETE" }),
  getPostKudos: (postId: string) =>
    api<KudosResponse>(`/api/posts/${postId}/kudos`),
  togglePostKudos: (postId: string) =>
    api<{ action: string; count: number; hasKudosed: boolean }>(
      `/api/posts/${postId}/kudos`, { method: "POST" }
    ),
  getPostComments: (postId: string) =>
    api<{ comments: Comment[] }>(`/api/posts/${postId}/comments`),
  addPostComment: (postId: string, text: string) =>
    api<{ comment: Comment }>(`/api/posts/${postId}/comments`, {
      method: "POST", body: JSON.stringify({ text })
    }),
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
  elevationGainM?: number | null;
  gpsQuality?: number;
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
  startLocation?: string | null;
  memberIsOnline?: boolean;
  prBadges?: string[];
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

export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sportType: string;
  city: string | null;
  visibility: string;
  memberCount: number;
  myRole?: string | null;
  createdBy: string;
}

export interface Post {
  id: string;
  memberId: string;
  memberName: string;
  memberImage: string | null;
  memberInitials: string;
  text: string | null;
  photoUrl: string | null;
  photoUrl2: string | null;
  photoUrl3: string | null;
  kudosCount: number;
  commentCount: number;
  hasKudosed: boolean;
  createdAt: string;
}

export interface WeeklyGoalResponse {
  goal: {
    distanceGoalM: number;
    runsGoal: number;
    currentStreak: number;
    longestStreak: number;
  };
  progress: {
    totalRuns: number;
    totalDistanceM: number;
    totalTimeSec: number;
    distanceGoalMet: boolean;
    runsGoalMet: boolean;
    weekComplete: boolean;
  };
  currentWeek: string;
}

export interface PersonalRecord {
  id: string;
  distance: string; // "1K" | "5K" | "10K" | "HM" | "MARATHON"
  timeSec: number;
  activityId: string;
  previousBestSec: number | null;
  improvement: number | null;
  createdAt: string;
  activityTitle?: string | null;
  activityDate?: string | null;
}
