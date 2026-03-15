import { z } from "zod";

// ─── Env schema ─── validated once at first access ───
const envSchema = z.object({
  // Required in ALL environments
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be ≥16 chars"),

  // Auth URL (optional, auto-detected on Vercel)
  AUTH_URL: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),

  // Strava (required when Strava features are enabled)
  STRAVA_CLIENT_ID: z.string().optional(),
  STRAVA_CLIENT_SECRET: z.string().optional(),
  STRAVA_TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64, "STRAVA_TOKEN_ENCRYPTION_KEY must be 64-char hex (32 bytes)")
    .optional(),
  STRAVA_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  // Optional services
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validates and returns typed environment variables.
 * Throws with clear diagnostics on first call if invalid.
 */
export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const msg = `\n❌ Environment validation failed:\n${missing}\n`;
    console.error(msg);
    throw new Error(msg);
  }
  _env = result.data;
  return _env;
}

/** Whether Strava features are fully configured */
export function isStravaConfigured(): boolean {
  return !!(
    process.env.STRAVA_CLIENT_ID &&
    process.env.STRAVA_CLIENT_SECRET &&
    process.env.STRAVA_TOKEN_ENCRYPTION_KEY
  );
}

/** Resolve the base URL for OAuth callbacks */
export function getBaseUrl(): string {
  // Explicit AUTH_URL that isn't localhost in production
  if (process.env.AUTH_URL && !process.env.AUTH_URL.includes("localhost")) {
    return process.env.AUTH_URL;
  }
  // Vercel auto-set
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback for local dev
  return (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}
