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
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
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

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
    startLocation: text("start_location"),
    endLocation: text("end_location"),
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
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
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

// ============================================================
// DOMAIN 5: SOCIAL (kudos, comments, follows, badges, invites)
// ============================================================

export const kudos = pgTable("kudos", {
  id: uuid().primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("kudos_unique").on(t.activityId, t.memberId),
  index("idx_kudos_activity").on(t.activityId),
  index("idx_kudos_member").on(t.memberId),
]);

export const comments = pgTable("comments", {
  id: uuid().primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  text: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_comments_activity").on(t.activityId),
  index("idx_comments_member").on(t.memberId),
]);

export const follows = pgTable("follows", {
  id: uuid().primaryKey().defaultRandom(),
  followerId: uuid("follower_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  followingId: uuid("following_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("follows_unique").on(t.followerId, t.followingId),
  index("idx_follows_follower").on(t.followerId),
  index("idx_follows_following").on(t.followingId),
]);

export const badges = pgTable("badges", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  iconEmoji: text("icon_emoji").notNull().default("🏅"),
  category: text().notNull().default("milestone"),
  triggerType: text("trigger_type").notNull(),
  triggerValue: real("trigger_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberBadges = pgTable("member_badges", {
  id: uuid().primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  badgeId: uuid("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  activityId: uuid("activity_id").references(() => activities.id),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("member_badges_unique").on(t.memberId, t.badgeId),
  index("idx_member_badges_member").on(t.memberId),
]);

// ============================================================
// DOMAIN 6: POSTS (standalone athlete posts, like Strava)
// ============================================================

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
  text: text("text"),
  photoUrl: text("photo_url"),
  photoUrl2: text("photo_url_2"),
  photoUrl3: text("photo_url_3"),
  privacy: text("privacy").default("public").notNull(),
  commentsEnabled: boolean("comments_enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_posts_member").on(table.memberId),
  index("idx_posts_created").on(table.createdAt),
]);

export const postKudos = pgTable("post_kudos", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("post_kudos_unique").on(table.postId, table.memberId),
  index("idx_post_kudos_post").on(table.postId),
  index("idx_post_kudos_member").on(table.memberId),
]);

export const postComments = pgTable("post_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_post_comments_post").on(table.postId),
  index("idx_post_comments_member").on(table.memberId),
]);

// ============================================================
// DOMAIN 7: GROUPS / CLUBS
// ============================================================

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  sportType: text("sport_type").default("running").notNull(),
  city: text("city"),
  visibility: text("visibility").default("public").notNull(), // public, private
  postPolicy: text("post_policy").default("everyone").notNull(), // everyone, admins
  createdBy: uuid("created_by").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("groups_slug_idx").on(table.slug),
  index("groups_city_idx").on(table.city),
]);

export const groupMembers = pgTable("group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(), // owner, admin, member
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("group_members_unique").on(table.groupId, table.memberId),
  index("idx_group_members_group").on(table.groupId),
  index("idx_group_members_member").on(table.memberId),
]);

export const groupInvites = pgTable("group_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  createdBy: uuid("created_by").notNull().references(() => members.id),
  usedBy: uuid("used_by").references(() => members.id),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_group_invites_group_code").on(table.groupId, table.code),
]);

export const inviteCodes = pgTable("invite_codes", {
  id: uuid().primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  code: text().notNull().unique(),
  usedBy: uuid("used_by").references(() => members.id),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// DOMAIN 9: WEEKLY GOALS & STREAKS
// ============================================================

export const weeklyGoals = pgTable("weekly_goals", {
  id: uuid().primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  distanceGoalM: integer("distance_goal_m").notNull().default(10000), // 10km default
  runsGoal: integer("runs_goal").notNull().default(3), // 3 runs/week default
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCompletedWeek: text("last_completed_week"), // ISO week "2026-W12"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("weekly_goals_member_unique").on(t.memberId),
]);

// ============================================================
// DOMAIN 10: ONBOARDING ANALYTICS
// ============================================================

export const onboardingProgress = pgTable("onboarding_progress", {
  id: uuid().primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  firstRunCompleted: boolean("first_run_completed").notNull().default(false),
  profileCompleted: boolean("profile_completed").notNull().default(false),
  socialSeedCompleted: boolean("social_seed_completed").notNull().default(false),
  firstInteractionCompleted: boolean("first_interaction_completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("onboarding_progress_member_unique").on(t.memberId),
]);

// ============================================================
// DOMAIN 11: PERSONAL RECORDS
// ============================================================

export const personalRecords = pgTable("personal_records", {
  id: uuid().primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  distance: text("distance").notNull(), // "1K", "5K", "10K", "HM", "MARATHON"
  timeSec: integer("time_sec").notNull(),
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  previousBestSec: integer("previous_best_sec"),
  improvement: real("improvement"), // percentage improvement
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("personal_records_member_distance").on(t.memberId, t.distance),
  index("idx_personal_records_member").on(t.memberId),
]);

// ============================================================
// DOMAIN 12: CHALLENGES
// ============================================================

export const challenges = pgTable("challenges", {
  id: uuid().primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // distance_total, run_count, elevation_total, streak_days
  goalValue: real("goal_value").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => members.id),
  visibility: text("visibility").notNull().default("public"), // public, group
  status: text("status").notNull().default("active"), // active, completed, upcoming
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_challenges_status").on(t.status),
  index("idx_challenges_group").on(t.groupId),
]);

export const challengeParticipants = pgTable("challenge_participants", {
  id: uuid().primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  progress: real("progress").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("challenge_participants_unique").on(t.challengeId, t.memberId),
  index("idx_challenge_participants_challenge").on(t.challengeId),
]);

export const onboardingEvents = pgTable("onboarding_events", {
  id: uuid().primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  eventName: text("event_name").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_onboarding_events_member").on(t.memberId),
  index("idx_onboarding_events_event").on(t.eventName),
]);

// ============================================================
// DOMAIN 13: CONVERSATIONS & MESSAGING
// ============================================================

export const conversations = pgTable("conversations", {
  id: uuid().primaryKey().defaultRandom(),
  type: text("type").notNull().default("direct"), // direct, group, event
  name: text("name"), // null for DMs, set for group chats
  imageUrl: text("image_url"),
  createdBy: uuid("created_by").references(() => members.id),
  // Denormalized for fast list rendering
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessagePreview: text("last_message_preview"),
  lastMessageBy: uuid("last_message_by").references(() => members.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_conversations_last_msg").on(t.lastMessageAt),
]);

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // owner, admin, member
  lastReadAt: timestamp("last_read_at", { withTimezone: true }),
  mutedUntil: timestamp("muted_until", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("conversation_participants_unique").on(t.conversationId, t.memberId),
  index("idx_conv_participants_member").on(t.memberId),
  index("idx_conv_participants_conv").on(t.conversationId),
]);

export const messages = pgTable("messages", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => members.id),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, image, system, location, activity_share
  mediaUrl: text("media_url"),
  replyToId: uuid("reply_to_id"), // for reply threads
  isEdited: boolean("is_edited").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_messages_conversation").on(t.conversationId),
  index("idx_messages_sender").on(t.senderId),
  index("idx_messages_created").on(t.createdAt),
]);

// ============================================================
// DOMAIN 14: REPORTS & MODERATION
// ============================================================

export const reports = pgTable("reports", {
  id: uuid().primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => members.id),
  targetType: text("target_type").notNull(), // post, comment, member, message, event, group
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(), // spam, harassment, inappropriate, misinformation, other
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, reviewed, resolved, dismissed
  reviewedBy: uuid("reviewed_by").references(() => members.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  action: text("action"), // warn, mute, ban, delete, none
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_reports_status").on(t.status),
  index("idx_reports_target").on(t.targetType, t.targetId),
]);
