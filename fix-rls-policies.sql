-- ============================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- ============================================
-- This fixes the 403 error when creating projects, test cases, etc.
-- ============================================

-- Function to auto-set created_by field
CREATE OR REPLACE FUNCTION auto_set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROJECTS
-- ============================================

-- Drop and recreate INSERT policy for projects
DROP POLICY IF EXISTS "Users can insert projects" ON projects;

CREATE POLICY "Users can insert projects" ON projects
    FOR INSERT WITH CHECK (
        created_by IS NULL OR created_by = auth.uid()
    );

-- Add trigger to auto-set created_by
DROP TRIGGER IF EXISTS set_created_by_trigger ON projects;
CREATE TRIGGER set_created_by_trigger
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_created_by();

-- ============================================
-- TEST CASES
-- ============================================

DROP POLICY IF EXISTS "Users can insert test cases in their projects" ON test_cases;

CREATE POLICY "Users can insert test cases in their projects" ON test_cases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Add trigger to auto-set created_by
DROP TRIGGER IF EXISTS set_created_by_trigger ON test_cases;
CREATE TRIGGER set_created_by_trigger
    BEFORE INSERT ON test_cases
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_created_by();

-- ============================================
-- TEST PLANS
-- ============================================

DROP POLICY IF EXISTS "Users can manage test plans" ON test_plans;

CREATE POLICY "Users can manage test plans" ON test_plans 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_plans.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Add trigger to auto-set created_by
DROP TRIGGER IF EXISTS set_created_by_trigger ON test_plans;
CREATE TRIGGER set_created_by_trigger
    BEFORE INSERT ON test_plans
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_created_by();

-- ============================================
-- TEST RUNS
-- ============================================

DROP POLICY IF EXISTS "Users can manage test runs" ON test_runs;

CREATE POLICY "Users can manage test runs" ON test_runs 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_runs.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Add trigger to auto-set created_by
DROP TRIGGER IF EXISTS set_created_by_trigger ON test_runs;
CREATE TRIGGER set_created_by_trigger
    BEFORE INSERT ON test_runs
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_created_by();

-- ============================================
-- TEST RUN RESULTS
-- ============================================

-- Update policy for test run results
DROP POLICY IF EXISTS "Users can manage test run results" ON test_run_results;

CREATE POLICY "Users can manage test run results" ON test_run_results 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM test_runs tr
            JOIN projects p ON p.id = tr.project_id
            WHERE tr.id = test_run_results.test_run_id 
            AND p.created_by = auth.uid()
        )
    );

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if triggers are created
SELECT 
    trigger_name, 
    event_object_table, 
    action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'set_created_by_trigger';

-- Check if policies exist
SELECT 
    tablename, 
    policyname, 
    cmd 
FROM pg_policies 
WHERE tablename IN ('projects', 'test_cases', 'test_plans', 'test_runs', 'test_run_results')
ORDER BY tablename, cmd;

-- ============================================
-- COMPLETE!
-- ============================================
-- Now you should be able to create projects, test cases, etc.
-- The created_by field will be automatically set to the logged-in user
-- ============================================
