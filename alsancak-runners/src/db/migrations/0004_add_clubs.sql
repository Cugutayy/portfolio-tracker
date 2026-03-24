CREATE TABLE IF NOT EXISTS "clubs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "visibility" text NOT NULL DEFAULT 'public',
  "city" text DEFAULT 'Izmir',
  "cover_image_url" text,
  "created_by" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_clubs_visibility" ON "clubs" ("visibility");
CREATE INDEX IF NOT EXISTS "idx_clubs_city" ON "clubs" ("city");

CREATE TABLE IF NOT EXISTS "club_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "club_id" uuid NOT NULL REFERENCES "clubs"("id") ON DELETE CASCADE,
  "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'member',
  "status" text NOT NULL DEFAULT 'active',
  "joined_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "club_members_unique" ON "club_members" ("club_id", "member_id");
CREATE INDEX IF NOT EXISTS "idx_club_members_club" ON "club_members" ("club_id");
CREATE INDEX IF NOT EXISTS "idx_club_members_member" ON "club_members" ("member_id");
CREATE INDEX IF NOT EXISTS "idx_club_members_status" ON "club_members" ("status");
