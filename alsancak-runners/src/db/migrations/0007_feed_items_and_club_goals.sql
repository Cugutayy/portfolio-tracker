CREATE TABLE IF NOT EXISTS "feed_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "item_type" text NOT NULL,
  "visibility" text NOT NULL DEFAULT 'members',
  "activity_id" uuid REFERENCES "activities"("id") ON DELETE CASCADE,
  "event_id" uuid REFERENCES "events"("id") ON DELETE CASCADE,
  "club_id" uuid REFERENCES "clubs"("id") ON DELETE CASCADE,
  "quality_score" real NOT NULL DEFAULT 0,
  "anti_spam_flags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_feed_items_created" ON "feed_items" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_feed_items_actor_created" ON "feed_items" ("actor_member_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_feed_items_type_created" ON "feed_items" ("item_type", "created_at");

CREATE TABLE IF NOT EXISTS "club_weekly_goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id" uuid NOT NULL REFERENCES "clubs"("id") ON DELETE CASCADE,
  "week_start" date NOT NULL,
  "target_distance_m" integer NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "club_weekly_goals_club_week_unique" ON "club_weekly_goals" ("club_id", "week_start");
CREATE INDEX IF NOT EXISTS "idx_club_weekly_goals_week" ON "club_weekly_goals" ("week_start");
