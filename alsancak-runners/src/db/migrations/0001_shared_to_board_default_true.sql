-- Update all existing activities to be shared by default (community app)
UPDATE activities SET shared_to_board = true WHERE shared_to_board = false;

-- Add geo index for efficient spatial queries on the Runs Explorer
CREATE INDEX IF NOT EXISTS idx_activities_geo ON activities (shared_to_board, start_lat, start_lng);
