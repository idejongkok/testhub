-- ============================================
-- SUPER CLEAN - Remove Everything
-- ============================================
-- This removes EVERYTHING related to the app
-- Run this if you want absolute clean slate
-- ============================================

-- Step 1: Drop all table policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 2: Drop all storage policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 3: Drop all tables
DROP TABLE IF EXISTS test_run_results CASCADE;
DROP TABLE IF EXISTS test_runs CASCADE;
DROP TABLE IF EXISTS test_plan_cases CASCADE;
DROP TABLE IF EXISTS test_plans CASCADE;
DROP TABLE IF EXISTS test_cases CASCADE;
DROP TABLE IF EXISTS test_suites CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Step 4: Drop storage bucket
DELETE FROM storage.buckets WHERE id = 'test-attachments';

-- Step 5: Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS auto_set_created_by() CASCADE;

-- Step 6: Drop enums
DROP TYPE IF EXISTS test_type CASCADE;
DROP TYPE IF EXISTS priority CASCADE;
DROP TYPE IF EXISTS status CASCADE;
DROP TYPE IF EXISTS run_status CASCADE;
DROP TYPE IF EXISTS result_status CASCADE;

-- Step 7: Verify cleanup
SELECT 'Cleanup complete! All tables, policies, functions, and enums removed.' as status;

-- Optional: Show remaining tables (should be empty for our app)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'test_cases', 'test_suites', 'test_plans', 'test_plan_cases', 'test_runs', 'test_run_results');

-- ============================================
-- Next step: Run database-schema.sql
-- ============================================
