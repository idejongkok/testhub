-- Add Feature and Platform columns to bugs table
-- These fields allow tracking which feature and platform a bug is related to

ALTER TABLE bugs
ADD COLUMN IF NOT EXISTS feature TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add comments for documentation
COMMENT ON COLUMN bugs.feature IS 'Feature related to the bug (e.g., login, checkout, bulk order)';
COMMENT ON COLUMN bugs.platform IS 'Platform where the bug was found (e.g., web, android, internal dashboard)';
