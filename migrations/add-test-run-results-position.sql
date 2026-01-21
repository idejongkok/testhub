-- Add position column to test_run_results for custom ordering
-- This allows users to reorder test cases within a test run

-- Add position column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'test_run_results'
        AND column_name = 'position'
    ) THEN
        ALTER TABLE test_run_results
        ADD COLUMN position INTEGER DEFAULT 0;

        RAISE NOTICE 'Added position column to test_run_results';
    ELSE
        RAISE NOTICE 'position column already exists in test_run_results';
    END IF;
END $$;

-- Update existing records to have sequential positions based on created_at
UPDATE test_run_results
SET position = subquery.row_num
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY test_run_id ORDER BY created_at) - 1 AS row_num
    FROM test_run_results
) AS subquery
WHERE test_run_results.id = subquery.id
AND test_run_results.position = 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_test_run_results_position
ON test_run_results(test_run_id, position);

-- Verify the update
SELECT
    COUNT(*) as total_records,
    COUNT(CASE WHEN position >= 0 THEN 1 END) as records_with_position
FROM test_run_results;
