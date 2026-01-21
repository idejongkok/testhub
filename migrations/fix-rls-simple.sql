-- Simplest possible RLS policy that should work

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects they created" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update their projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects they own or admin" ON projects;
DROP POLICY IF EXISTS "Users can delete their projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects they own" ON projects;

-- Create SIMPLE policy - just check created_by for now
CREATE POLICY "Users can view projects they created" ON projects
    FOR SELECT
    USING (created_by = auth.uid());

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update projects they created" ON projects
    FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete projects they created" ON projects
    FOR DELETE
    USING (created_by = auth.uid());

-- Test: This should return projects
SELECT * FROM projects WHERE created_by = auth.uid();
