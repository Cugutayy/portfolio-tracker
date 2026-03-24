CREATE TABLE IF NOT EXISTS "weekly_goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "distance_goal_m" integer NOT NULL DEFAULT 10000,
  "runs_goal" integer NOT NULL DEFAULT 3,
  "current_streak" integer NOT NULL DEFAULT 0,
  "longest_streak" integer NOT NULL DEFAULT 0,
  "last_completed_week" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_goals_member_unique" ON "weekly_goals" ("member_id");
