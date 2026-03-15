import { db } from "./db";
import { stravaConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  encryptTokenPair,
  decryptAccessToken,
  decryptRefreshToken,
} from "./crypto";

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_AUTH = "https://www.strava.com/oauth";

function getBaseUrl(): string {
  // Production: use AUTH_URL if it's not localhost
  if (process.env.AUTH_URL && !process.env.AUTH_URL.includes("localhost")) {
    return process.env.AUTH_URL;
  }
  // Vercel: construct from VERCEL_URL (auto-set by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback to AUTH_URL or NEXTAUTH_URL for local dev
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export function getStravaAuthUrl(state: string, origin?: string): string {
  const baseUrl = origin || getBaseUrl();
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: `${baseUrl}/api/strava/callback`,
    scope: "read,activity:read_all",
    state,
    approval_prompt: "auto",
  });
  return `${STRAVA_AUTH}/authorize?${params}`;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
    city: string;
  };
}

export async function exchangeCode(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(`${STRAVA_AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Strava token exchange failed: ${err}`);
  }
  return res.json();
}

export async function refreshAccessToken(connectionId: string): Promise<string> {
  const [conn] = await db
    .select()
    .from(stravaConnections)
    .where(eq(stravaConnections.id, connectionId))
    .limit(1);

  if (!conn) throw new Error("Connection not found");

  // Check if token is still valid (5 min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (conn.tokenExpiresAt > now + 300) {
    return decryptAccessToken(conn.accessTokenEnc, conn.tokenIv, conn.tokenTag);
  }

  // Refresh the token
  const refreshToken = decryptRefreshToken(conn.refreshTokenEnc);
  const res = await fetch(`${STRAVA_AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava refresh failed: ${res.status}`);
  }

  const data = await res.json();
  const encrypted = encryptTokenPair(data.access_token, data.refresh_token);

  await db
    .update(stravaConnections)
    .set({
      ...encrypted,
      tokenExpiresAt: data.expires_at,
      updatedAt: new Date(),
    })
    .where(eq(stravaConnections.id, connectionId));

  return data.access_token;
}

export async function stravaGet<T>(
  accessToken: string,
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${STRAVA_API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Strava API ${path}: ${res.status}`);
  }
  return res.json();
}

export async function revokeAccess(accessToken: string): Promise<void> {
  await fetch(`${STRAVA_AUTH}/deauthorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `access_token=${accessToken}`,
  });
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  elev_low: number;
  elev_high: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  calories?: number;
  map: {
    id: string;
    summary_polyline: string;
    polyline?: string;
  };
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  splits_metric?: Array<{
    split: number;
    distance: number;
    elapsed_time: number;
    moving_time: number;
    elevation_difference: number;
    average_speed: number;
    average_heartrate?: number;
    pace_zone: number;
  }>;
  photos?: {
    count: number;
    primary?: {
      id: number;
      urls: Record<string, string>;
    };
  };
}

/** Convert Strava speed (m/s) to pace (sec/km) */
export function speedToPace(speedMs: number): number | null {
  if (speedMs <= 0) return null;
  return Math.round(1000 / speedMs);
}
