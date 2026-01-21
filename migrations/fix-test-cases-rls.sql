-- Fix RLS policies for test_cases to restore access

-- Drop existing policies that use project_members subquery
DROP POLICY IF EXISTS "Users can view test cases in their projects" ON test_cases;
DROP POLICY IF EXISTS "Users can insert test cases in their projects" ON test_cases;
DROP POLICY IF EXISTS "Users can update test cases in their projects" ON test_cases;
DROP POLICY IF EXISTS "Users can delete test cases in their projects" ON test_cases;

-- Create SIMPLE policies that only check project creator
-- (We'll add team member support later with a different approach)

CREATE POLICY "Users can view test cases in their projects" ON test_cases
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = test_cases.project_id
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert test cases in their projects" ON test_cases
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = test_cases.project_id
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update test cases in their projects" ON test_cases
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = test_cases.project_id
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete test cases in their projects" ON test_cases
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = test_cases.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- Test: Check if test cases are visible
SELECT COUNT(*) as test_case_count FROM test_cases;

-- Verify which test cases should be visible
SELECT
    tc.id,
    tc.title,
    p.name as project_name,
    p.created_by,
    CASE
        WHEN p.created_by = auth.uid() THEN 'Visible'
        ELSE 'Hidden'
    END as visibility
FROM test_cases tc
JOIN projects p ON p.id = tc.project_id
LIMIT 10;
