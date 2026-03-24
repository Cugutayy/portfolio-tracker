CREATE TABLE IF NOT EXISTS "onboarding_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "event_name" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_onboarding_events_member" ON "onboarding_events" ("member_id");
CREATE INDEX IF NOT EXISTS "idx_onboarding_events_event" ON "onboarding_events" ("event_name");
CREATE INDEX IF NOT EXISTS "idx_onboarding_events_member_event_time" ON "onboarding_events" ("member_id", "event_name", "created_at");
