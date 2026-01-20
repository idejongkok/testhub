-- ============================================
-- CLEAN DATABASE - Drop all tables & enums
-- ============================================
-- WARNING: This will delete ALL data!
-- Only use this if you want a fresh start
-- ============================================

-- Drop all tables in correct order (dependencies first)
DROP TABLE IF EXISTS test_run_results CASCADE;
DROP TABLE IF EXISTS test_runs CASCADE;
DROP TABLE IF EXISTS test_plan_cases CASCADE;
DROP TABLE IF EXISTS test_plans CASCADE;
DROP TABLE IF EXISTS test_cases CASCADE;
DROP TABLE IF EXISTS test_suites CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Drop storage bucket
DELETE FROM storage.buckets WHERE id = 'test-attachments';

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS auto_set_created_by() CASCADE;

-- Drop enums (IMPORTANT!)
DROP TYPE IF EXISTS test_type CASCADE;
DROP TYPE IF EXISTS priority CASCADE;
DROP TYPE IF EXISTS status CASCADE;
DROP TYPE IF EXISTS run_status CASCADE;
DROP TYPE IF EXISTS result_status CASCADE;

-- Verify all tables are dropped
SELECT 'All tables, functions, and enums dropped successfully!' as status;

-- ============================================
-- Now run: database-schema.sql
-- ============================================
