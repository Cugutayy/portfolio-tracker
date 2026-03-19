import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  bigint,
  jsonb,
  date,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// DOMAIN 1: IDENTITY (Auth.js compatible + extensions)
// ============================================================

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    image: text("image"),
    instagram: text("instagram"),
    paceGroup: text("pace_group"),
    bio: text("bio"),
    role: text("role").notNull().default("member"),
    privacy: text("privacy").notNull().default("private"),
    onboardingDone: boolean("onboarding_done").notNull().default(false),
    pushToken: text("push_token"),
    pushPlatform: text("push_platform"), // "ios" | "android"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_members_email").on(table.email),
  ],
);

export const membersRelations = relations(members, ({ one, many }) => ({
  stravaConnection: one(stravaConnections, {
    fields: [members.id],
    references: [stravaConnections.memberId],
  }),
  activities: many(activities),
  eventRsvps: many(eventRsvps),
  communityStats: many(communityStats),
}));

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_unique").on(table.provider, table.providerAccountId),
    index("idx_accounts_user_id").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionToken: text("session_token").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
  ],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ],
);

export const oauthStates = pgTable(
  "oauth_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    nonce: text("nonce").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ============================================================
// DOMAIN 2: STRAVA INTEGRATION
// ============================================================

export const stravaConnections = pgTable(
  "strava_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().unique().references(() => members.id, { onDelete: "cascade" }),
    stravaAthleteId: bigint("strava_athlete_id", { mode: "number" }).notNull().unique(),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc").notNull(),
    tokenIv: text("token_iv").notNull(),
    tokenTag: text("token_tag").notNull(),
    tokenExpiresAt: bigint("token_expires_at", { mode: "number" }).notNull(),
    scopes: text("scopes").notNull().default("read,activity:read_all"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    syncCursor: bigint("sync_cursor", { mode: "number" }),
    backfillComplete: boolean("backfill_complete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_strava_conn_athlete").on(table.stravaAthleteId),
  ],
);

export const stravaConnectionsRelations = relations(stravaConnections, ({ one }) => ({
  member: one(members, {
    fields: [stravaConnections.memberId],
    references: [members.id],
  }),
}));

export const stravaWebhookEvents = pgTable(
  "strava_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stravaEventId: bigint("strava_event_id", { mode: "number" }),
    objectType: text("object_type").notNull(),
    objectId: bigint("object_id", { mode: "number" }).notNull(),
    aspectType: text("aspect_type").notNull(),
    ownerId: bigint("owner_id", { mode: "number" }).notNull(),
    subscriptionId: bigint("subscription_id", { mode: "number" }).notNull(),
    eventTime: bigint("event_time", { mode: "number" }).notNull(),
    updates: jsonb("updates"),
    rawPayload: jsonb("raw_payload").notNull(),
    status: text("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(0),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_webhook_events_owner").on(table.ownerId),
    index("idx_webhook_events_status").on(table.status),
    index("idx_webhook_events_object").on(table.objectType, table.objectId),
  ],
);

// ============================================================
// DOMAIN 3: ACTIVITIES
// ============================================================

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    stravaActivityId: bigint("strava_activity_id", { mode: "number" }).unique(),
    source: text("source").notNull().default("strava"),
    title: text("title").notNull(),
    activityType: text("activity_type").notNull().default("run"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    elapsedTimeSec: integer("elapsed_time_sec").notNull(),
    movingTimeSec: integer("moving_time_sec").notNull(),
    distanceM: real("distance_m").notNull(),
    elevationGainM: real("elevation_gain_m"),
    elevationLossM: real("elevation_loss_m"),
    avgPaceSecKm: real("avg_pace_sec_km"),
    maxPaceSecKm: real("max_pace_sec_km"),
    avgHeartrate: real("avg_heartrate"),
    maxHeartrate: real("max_heartrate"),
    calories: real("calories"),
    avgCadence: real("avg_cadence"),
    polylineEncoded: text("polyline_encoded"),
    polylineGeojson: jsonb("polyline_geojson"),
    startLat: real("start_lat"),
    startLng: real("start_lng"),
    endLat: real("end_lat"),
    endLng: real("end_lng"),
    city: text("city").default("Izmir"),
    weatherTempC: real("weather_temp_c"),
    weatherCondition: text("weather_condition"),
    privacy: text("privacy").notNull().default("private"),
    sharedToBoard: boolean("shared_to_board").notNull().default(true),
    stravaRaw: jsonb("strava_raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_activities_member").on(table.memberId),
    index("idx_activities_start_time").on(table.memberId, table.startTime),
    index("idx_activities_shared").on(table.sharedToBoard, table.startTime),
    index("idx_activities_city_time").on(table.city, table.startTime),
    index("idx_activities_geo").on(table.sharedToBoard, table.startLat, table.startLng),
  ],
);

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  member: one(members, {
    fields: [activities.memberId],
    references: [members.id],
  }),
  splits: many(activitySplits),
  photos: many(activityPhotos),
  eventActivities: many(eventActivities),
}));

export const activitySplits = pgTable(
  "activity_splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
    splitIndex: integer("split_index").notNull(),
    distanceM: real("distance_m").notNull(),
    elapsedTimeSec: integer("elapsed_time_sec").notNull(),
    movingTimeSec: integer("moving_time_sec").notNull(),
    elevationDiffM: real("elevation_diff_m"),
    avgPaceSecKm: real("avg_pace_sec_km").notNull(),
    avgHeartrate: real("avg_heartrate"),
  },
  (table) => [
    uniqueIndex("activity_splits_unique").on(table.activityId, table.splitIndex),
    index("idx_activity_splits_activity").on(table.activityId),
  ],
);

export const activitySplitsRelations = relations(activitySplits, ({ one }) => ({
  activity: one(activities, {
    fields: [activitySplits.activityId],
    references: [activities.id],
  }),
}));

export const activityPhotos = pgTable(
  "activity_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
    stravaPhotoId: bigint("strava_photo_id", { mode: "number" }),
    url: text("url").notNull(),
    caption: text("caption"),
    lat: real("lat"),
    lng: real("lng"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const activityPhotosRelations = relations(activityPhotos, ({ one }) => ({
  activity: one(activities, {
    fields: [activityPhotos.activityId],
    references: [activities.id],
  }),
}));

// ============================================================
// DOMAIN 4: COMMUNITY (events, routes, leaderboard)
// ============================================================

export const routes = pgTable(
  "routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    distanceM: real("distance_m").notNull(),
    elevationGainM: real("elevation_gain_m"),
    polylineGeojson: jsonb("polyline_geojson"),
    startLat: real("start_lat"),
    startLng: real("start_lng"),
    endLat: real("end_lat"),
    endLng: real("end_lng"),
    surfaceType: text("surface_type").default("road"),
    difficulty: text("difficulty").default("moderate"),
    city: text("city").default("Izmir"),
    isLoop: boolean("is_loop").notNull().default(false),
    editorialSvg: text("editorial_svg"),
    createdBy: uuid("created_by").references(() => members.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_routes_slug").on(table.slug),
  ],
);

export const routesRelations = relations(routes, ({ many }) => ({
  segments: many(routeSegments),
  events: many(events),
}));

export const routeSegments = pgTable(
  "route_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id").notNull().references(() => routes.id, { onDelete: "cascade" }),
    segmentIndex: integer("segment_index").notNull(),
    name: text("name"),
    distanceM: real("distance_m").notNull(),
    elevationM: real("elevation_m"),
    surfaceType: text("surface_type"),
    polylineGeojson: jsonb("polyline_geojson"),
  },
  (table) => [
    uniqueIndex("route_segments_unique").on(table.routeId, table.segmentIndex),
  ],
);

export const routeSegmentsRelations = relations(routeSegments, ({ one }) => ({
  route: one(routes, {
    fields: [routeSegments.routeId],
    references: [routes.id],
  }),
}));

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    eventType: text("event_type").notNull().default("group_run"),
    routeId: uuid("route_id").references(() => routes.id),
    date: timestamp("date", { withTimezone: true }).notNull(),
    meetingPoint: text("meeting_point"),
    meetingLat: real("meeting_lat"),
    meetingLng: real("meeting_lng"),
    distanceM: real("distance_m"),
    paceGroups: jsonb("pace_groups"),
    maxParticipants: integer("max_participants"),
    coverImageUrl: text("cover_image_url"),
    recurring: boolean("recurring").notNull().default(false),
    recurrenceRule: text("recurrence_rule"),
    status: text("status").notNull().default("upcoming"),
    createdBy: uuid("created_by").references(() => members.id),
    sanityRunId: text("sanity_run_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_events_date").on(table.date),
    index("idx_events_slug").on(table.slug),
  ],
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  route: one(routes, {
    fields: [events.routeId],
    references: [routes.id],
  }),
  rsvps: many(eventRsvps),
  eventActivities: many(eventActivities),
}));

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    paceGroup: text("pace_group"),
    status: text("status").notNull().default("going"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_rsvps_unique").on(table.eventId, table.memberId),
    index("idx_event_rsvps_event").on(table.eventId),
    index("idx_event_rsvps_member").on(table.memberId),
  ],
);

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  member: one(members, {
    fields: [eventRsvps.memberId],
    references: [members.id],
  }),
}));

export const eventActivities = pgTable(
  "event_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    matchType: text("match_type").notNull().default("auto"),
    matchScore: real("match_score"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_activities_unique").on(table.eventId, table.activityId),
    index("idx_event_activities_event").on(table.eventId),
    index("idx_event_activities_member").on(table.memberId),
  ],
);

export const eventActivitiesRelations = relations(eventActivities, ({ one }) => ({
  event: one(events, {
    fields: [eventActivities.eventId],
    references: [events.id],
  }),
  activity: one(activities, {
    fields: [eventActivities.activityId],
    references: [activities.id],
  }),
  member: one(members, {
    fields: [eventActivities.memberId],
    references: [members.id],
  }),
}));

export const communityStats = pgTable(
  "community_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    periodStart: date("period_start").notNull(),
    totalRuns: integer("total_runs").notNull().default(0),
    totalDistanceM: real("total_distance_m").notNull().default(0),
    totalTimeSec: integer("total_time_sec").notNull().default(0),
    totalElevationM: real("total_elevation_m").notNull().default(0),
    avgPaceSecKm: real("avg_pace_sec_km"),
    longestRunM: real("longest_run_m"),
    eventsAttended: integer("events_attended").notNull().default(0),
    streakDays: integer("streak_days").notNull().default(0),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("community_stats_unique").on(table.memberId, table.period, table.periodStart),
    index("idx_community_stats_leaderboard").on(table.period, table.periodStart, table.totalDistanceM),
  ],
);

export const communityStatsRelations = relations(communityStats, ({ one }) => ({
  member: one(members, {
    fields: [communityStats.memberId],
    references: [members.id],
  }),
}));
