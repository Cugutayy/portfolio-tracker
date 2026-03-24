CREATE TABLE IF NOT EXISTS "onboarding_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "first_run_completed" boolean NOT NULL DEFAULT false,
  "profile_completed" boolean NOT NULL DEFAULT false,
  "social_seed_completed" boolean NOT NULL DEFAULT false,
  "first_interaction_completed" boolean NOT NULL DEFAULT false,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_progress_member_unique" ON "onboarding_progress" ("member_id");
CREATE INDEX IF NOT EXISTS "idx_onboarding_member" ON "onboarding_progress" ("member_id");
