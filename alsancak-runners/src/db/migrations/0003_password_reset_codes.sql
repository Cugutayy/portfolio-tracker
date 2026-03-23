CREATE TABLE IF NOT EXISTS "password_reset_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_codes_email_unique" ON "password_reset_codes" ("email");
CREATE INDEX IF NOT EXISTS "idx_password_reset_codes_expires_at" ON "password_reset_codes" ("expires_at");
