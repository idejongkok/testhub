-- Check the current structure of test_run_results table
-- This helps diagnose the result_status column issue

-- Check if table exists
SELECT
    table_name,
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'test_run_results'
ORDER BY ordinal_position;

-- Check if result_status type exists
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'result_status'
ORDER BY e.enumsortorder;

-- Check constraints on test_run_results table
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'test_run_results'
    AND nsp.nspname = 'public';
