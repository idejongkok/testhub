-- Final Fix: Correct RLS Policies for Projects
-- This ensures users can see projects they created OR are members of

-- 1. Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects they created" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can update their projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects they own or admin" ON projects;
DROP POLICY IF EXISTS "Users can delete their projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects they own" ON projects;

-- 3. Create NEW correct policies

-- SELECT: Users can view projects they created OR are members of
CREATE POLICY "Users can view their projects" ON projects
    FOR SELECT
    TO authenticated
    USING (
        -- Creator can always see their project
        created_by = auth.uid()
        OR
        -- OR user is a member of the project
        id IN (
            SELECT project_id
            FROM project_members
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: Any authenticated user can create projects
CREATE POLICY "Users can create projects" ON projects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid()
    );

-- UPDATE: Only creator or admin/owner members can update
CREATE POLICY "Users can update their projects" ON projects
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR
        id IN (
            SELECT project_id
            FROM project_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- DELETE: Only creator can delete
CREATE POLICY "Users can delete their projects" ON projects
    FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
    );

-- 4. Verify policies work
SELECT
    'Policy Test' as test,
    COUNT(*) as project_count,
    CASE
        WHEN COUNT(*) > 0 THEN 'SUCCESS - Projects visible'
        ELSE 'FAILED - No projects visible'
    END as result
FROM projects;

-- 5. Show which projects are visible and why
SELECT
    p.id,
    p.name,
    p.code,
    CASE
        WHEN p.created_by = auth.uid() THEN 'Creator'
        WHEN EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        ) THEN 'Member'
        ELSE 'Unknown'
    END as access_reason
FROM projects p
WHERE
    p.created_by = auth.uid()
    OR
    p.id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid());
