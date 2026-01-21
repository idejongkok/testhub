-- Check and fix result_status column type and constraints
-- This diagnoses and fixes issues with the result_status column

-- Step 1: Check current column type
SELECT
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'test_run_results'
AND column_name = 'result_status';

-- Step 2: Check existing constraints
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'test_run_results'
AND con.conname LIKE '%result_status%';

-- Step 3: Check if result_status enum type exists and has 'untested'
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'result_status'
ORDER BY e.enumsortorder;

-- Step 4: Fix the column - Drop old constraint and convert to enum type
-- WARNING: This will temporarily allow any value, then restrict to enum values
DO $$
BEGIN
    -- Drop existing check constraints on result_status
    IF EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'test_run_results'
        AND con.conname = 'test_run_results_result_status_check'
    ) THEN
        ALTER TABLE test_run_results DROP CONSTRAINT test_run_results_result_status_check;
        RAISE NOTICE 'Dropped old check constraint test_run_results_result_status_check';
    END IF;

    -- Check if column is already using the enum type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'test_run_results'
        AND column_name = 'result_status'
        AND udt_name = 'result_status'
    ) THEN
        RAISE NOTICE 'Column already uses result_status enum type';
    ELSE
        -- Convert column to use enum type
        RAISE NOTICE 'Converting column to use result_status enum type';

        -- First, update any invalid values to 'untested'
        UPDATE test_run_results
        SET result_status = 'untested'
        WHERE result_status NOT IN ('untested', 'in_progress', 'passed', 'failed', 'blocked', 'skipped')
        OR result_status IS NULL;

        -- Drop existing default before converting
        ALTER TABLE test_run_results
        ALTER COLUMN result_status DROP DEFAULT;

        -- Then alter the column type
        ALTER TABLE test_run_results
        ALTER COLUMN result_status TYPE result_status USING result_status::result_status;

        -- Set new default value
        ALTER TABLE test_run_results
        ALTER COLUMN result_status SET DEFAULT 'untested'::result_status;

        RAISE NOTICE 'Successfully converted column to enum type';
    END IF;
END $$;

-- Step 5: Verify the fix
SELECT
    'Column type:' as info,
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns
WHERE table_name = 'test_run_results'
AND column_name = 'result_status';

-- Show sample data
SELECT result_status, COUNT(*) as count
FROM test_run_results
GROUP BY result_status
ORDER BY result_status;
