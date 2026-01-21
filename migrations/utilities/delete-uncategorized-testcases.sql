-- Delete all test cases that are uncategorized (suite_id IS NULL)
-- This will also cascade delete related records (test_run_results, test_plan_cases)

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Count test cases before deletion
    SELECT COUNT(*) INTO deleted_count
    FROM test_cases
    WHERE suite_id IS NULL;

    RAISE NOTICE 'Found % uncategorized test cases to delete', deleted_count;

    -- Delete test cases where suite_id is NULL (this will cascade to related tables)
    DELETE FROM test_cases
    WHERE suite_id IS NULL;

    RAISE NOTICE 'Successfully deleted % uncategorized test cases', deleted_count;
END $$;

-- Verify deletion
SELECT
    COUNT(*) as remaining_uncategorized_test_cases
FROM test_cases
WHERE suite_id IS NULL;
