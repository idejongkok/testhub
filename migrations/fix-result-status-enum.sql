-- Fix result_status enum to include 'untested' value if missing
-- This fixes the error: "violates check constraint test_run_results_result_status_check"

-- Step 1: Create the result_status type if it doesn't exist
DO $$
BEGIN
    -- Check if the type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'result_status') THEN
        -- Create the type with all values
        CREATE TYPE result_status AS ENUM (
            'untested',
            'in_progress',
            'passed',
            'failed',
            'blocked',
            'skipped'
        );
        RAISE NOTICE 'Created result_status enum type';
    ELSE
        RAISE NOTICE 'result_status type already exists';

        -- Step 2: If type exists, check if 'untested' value exists
        IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'result_status'
            AND e.enumlabel = 'untested'
        ) THEN
            -- Add 'untested' value if missing
            -- We need to add it in the right position
            -- Try adding before 'in_progress' if it exists, otherwise add first
            IF EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'result_status'
                AND e.enumlabel = 'in_progress'
            ) THEN
                ALTER TYPE result_status ADD VALUE 'untested' BEFORE 'in_progress';
            ELSE
                ALTER TYPE result_status ADD VALUE 'untested';
            END IF;
            RAISE NOTICE 'Added untested to result_status enum';
        ELSE
            RAISE NOTICE 'untested already exists in result_status enum';
        END IF;
    END IF;
END $$;

-- Verify the enum values
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'result_status') THEN
        RAISE NOTICE 'Current result_status enum values:';
    END IF;
END $$;

SELECT enumlabel AS result_status_values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'result_status'
ORDER BY e.enumsortorder;
