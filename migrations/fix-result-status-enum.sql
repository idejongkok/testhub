-- Fix result_status enum to include 'untested' value if missing
-- This fixes the error: "violates check constraint test_run_results_result_status_check"

-- Check if 'untested' exists in result_status enum
DO $$
BEGIN
    -- Try to add 'untested' to the enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'result_status'
        AND e.enumlabel = 'untested'
    ) THEN
        -- Add 'untested' as the first value in the enum
        ALTER TYPE result_status ADD VALUE 'untested' BEFORE 'in_progress';
        RAISE NOTICE 'Added untested to result_status enum';
    ELSE
        RAISE NOTICE 'untested already exists in result_status enum';
    END IF;
END $$;

-- Verify the enum values
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'result_status'
ORDER BY e.enumsortorder;
