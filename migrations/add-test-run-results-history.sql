-- Add history column to test_run_results for retest tracking
-- This stores previous execution results when a test case is retested

-- Add history column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'test_run_results'
        AND column_name = 'history'
    ) THEN
        ALTER TABLE test_run_results
        ADD COLUMN history JSONB DEFAULT '[]'::jsonb;

        RAISE NOTICE 'Added history column to test_run_results';
    ELSE
        RAISE NOTICE 'history column already exists in test_run_results';
    END IF;
END $$;

-- Add retest_count column for quick access to number of retests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'test_run_results'
        AND column_name = 'retest_count'
    ) THEN
        ALTER TABLE test_run_results
        ADD COLUMN retest_count INTEGER DEFAULT 0;

        RAISE NOTICE 'Added retest_count column to test_run_results';
    ELSE
        RAISE NOTICE 'retest_count column already exists in test_run_results';
    END IF;
END $$;

-- History structure:
-- [
--   {
--     "result_status": "failed",
--     "actual_result": "...",
--     "comments": "...",
--     "attachments": [...],
--     "execution_time": 5,
--     "executed_by": "user-uuid",
--     "executed_at": "2024-01-01T00:00:00Z",
--     "retested_at": "2024-01-02T00:00:00Z"  -- when this was replaced by a new result
--   }
-- ]

-- Verify the update
SELECT
    COUNT(*) as total_records,
    COUNT(CASE WHEN history IS NOT NULL THEN 1 END) as records_with_history
FROM test_run_results;
