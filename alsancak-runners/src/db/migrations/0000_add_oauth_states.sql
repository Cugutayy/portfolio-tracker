CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"strava_activity_id" bigint,
	"source" text DEFAULT 'strava' NOT NULL,
	"title" text NOT NULL,
	"activity_type" text DEFAULT 'run' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"elapsed_time_sec" integer NOT NULL,
	"moving_time_sec" integer NOT NULL,
	"distance_m" real NOT NULL,
	"elevation_gain_m" real,
	"elevation_loss_m" real,
	"avg_pace_sec_km" real,
	"max_pace_sec_km" real,
	"avg_heartrate" real,
	"max_heartrate" real,
	"calories" real,
	"avg_cadence" real,
	"polyline_encoded" text,
	"polyline_geojson" jsonb,
	"start_lat" real,
	"start_lng" real,
	"end_lat" real,
	"end_lng" real,
	"city" text DEFAULT 'Izmir',
	"weather_temp_c" real,
	"weather_condition" text,
	"privacy" text DEFAULT 'private' NOT NULL,
	"shared_to_board" boolean DEFAULT false NOT NULL,
	"strava_raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_strava_activity_id_unique" UNIQUE("strava_activity_id")
);
--> statement-breakpoint
CREATE TABLE "activity_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"strava_photo_id" bigint,
	"url" text NOT NULL,
	"caption" text,
	"lat" real,
	"lng" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"split_index" integer NOT NULL,
	"distance_m" real NOT NULL,
	"elapsed_time_sec" integer NOT NULL,
	"moving_time_sec" integer NOT NULL,
	"elevation_diff_m" real,
	"avg_pace_sec_km" real NOT NULL,
	"avg_heartrate" real
);
--> statement-breakpoint
CREATE TABLE "community_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"period" text NOT NULL,
	"period_start" date NOT NULL,
	"total_runs" integer DEFAULT 0 NOT NULL,
	"total_distance_m" real DEFAULT 0 NOT NULL,
	"total_time_sec" integer DEFAULT 0 NOT NULL,
	"total_elevation_m" real DEFAULT 0 NOT NULL,
	"avg_pace_sec_km" real,
	"longest_run_m" real,
	"events_attended" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"match_type" text DEFAULT 'auto' NOT NULL,
	"match_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"pace_group" text,
	"status" text DEFAULT 'going' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"event_type" text DEFAULT 'group_run' NOT NULL,
	"route_id" uuid,
	"date" timestamp with time zone NOT NULL,
	"meeting_point" text,
	"meeting_lat" real,
	"meeting_lng" real,
	"distance_m" real,
	"pace_groups" jsonb,
	"max_participants" integer,
	"cover_image_url" text,
	"recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_by" uuid,
	"sanity_run_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"password_hash" text,
	"name" text NOT NULL,
	"image" text,
	"instagram" text,
	"pace_group" text,
	"bio" text,
	"role" text DEFAULT 'member' NOT NULL,
	"privacy" text DEFAULT 'private' NOT NULL,
	"onboarding_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"nonce" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_states_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE "route_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"segment_index" integer NOT NULL,
	"name" text,
	"distance_m" real NOT NULL,
	"elevation_m" real,
	"surface_type" text,
	"polyline_geojson" jsonb
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"distance_m" real NOT NULL,
	"elevation_gain_m" real,
	"polyline_geojson" jsonb,
	"start_lat" real,
	"start_lng" real,
	"end_lat" real,
	"end_lng" real,
	"surface_type" text DEFAULT 'road',
	"difficulty" text DEFAULT 'moderate',
	"city" text DEFAULT 'Izmir',
	"is_loop" boolean DEFAULT false NOT NULL,
	"editorial_svg" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "strava_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"strava_athlete_id" bigint NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"token_iv" text NOT NULL,
	"token_tag" text NOT NULL,
	"token_expires_at" bigint NOT NULL,
	"scopes" text DEFAULT 'read,activity:read_all' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"sync_cursor" bigint,
	"backfill_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strava_connections_member_id_unique" UNIQUE("member_id"),
	CONSTRAINT "strava_connections_strava_athlete_id_unique" UNIQUE("strava_athlete_id")
);
--> statement-breakpoint
CREATE TABLE "strava_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strava_event_id" bigint,
	"object_type" text NOT NULL,
	"object_id" bigint NOT NULL,
	"aspect_type" text NOT NULL,
	"owner_id" bigint NOT NULL,
	"subscription_id" bigint NOT NULL,
	"event_time" bigint NOT NULL,
	"updates" jsonb,
	"raw_payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token"),
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_photos" ADD CONSTRAINT "activity_photos_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_splits" ADD CONSTRAINT "activity_splits_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_stats" ADD CONSTRAINT "community_stats_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_segments" ADD CONSTRAINT "route_segments_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD CONSTRAINT "strava_connections_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_user_id" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_activities_member" ON "activities" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_activities_start_time" ON "activities" USING btree ("member_id","start_time");--> statement-breakpoint
CREATE INDEX "idx_activities_shared" ON "activities" USING btree ("shared_to_board","start_time");--> statement-breakpoint
CREATE INDEX "idx_activities_city_time" ON "activities" USING btree ("city","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_splits_unique" ON "activity_splits" USING btree ("activity_id","split_index");--> statement-breakpoint
CREATE INDEX "idx_activity_splits_activity" ON "activity_splits" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_stats_unique" ON "community_stats" USING btree ("member_id","period","period_start");--> statement-breakpoint
CREATE INDEX "idx_community_stats_leaderboard" ON "community_stats" USING btree ("period","period_start","total_distance_m");--> statement-breakpoint
CREATE UNIQUE INDEX "event_activities_unique" ON "event_activities" USING btree ("event_id","activity_id");--> statement-breakpoint
CREATE INDEX "idx_event_activities_event" ON "event_activities" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_activities_member" ON "event_activities" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_rsvps_unique" ON "event_rsvps" USING btree ("event_id","member_id");--> statement-breakpoint
CREATE INDEX "idx_event_rsvps_event" ON "event_rsvps" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_rsvps_member" ON "event_rsvps" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_events_date" ON "events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_events_slug" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_members_email" ON "members" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "route_segments_unique" ON "route_segments" USING btree ("route_id","segment_index");--> statement-breakpoint
CREATE INDEX "idx_routes_slug" ON "routes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_strava_conn_athlete" ON "strava_connections" USING btree ("strava_athlete_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_owner" ON "strava_webhook_events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_status" ON "strava_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_object" ON "strava_webhook_events" USING btree ("object_type","object_id");