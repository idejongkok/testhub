-- Fix RLS Policies for Project Access
-- Make it simpler and more permissive

-- 1. Drop all existing policies on projects
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects they created" ON projects;
DROP POLICY IF EXISTS "Users can update projects they own or admin" ON projects;
DROP POLICY IF EXISTS "Users can update their projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects they own" ON projects;
DROP POLICY IF EXISTS "Users can delete their projects" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;

-- 2. Create simpler, more permissive policies
-- Allow viewing if user is creator OR is a member
CREATE POLICY "Users can view their projects" ON projects
    FOR SELECT
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
    );

-- Allow insert for authenticated users
CREATE POLICY "Users can insert projects" ON projects
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow update if creator or admin/owner member
CREATE POLICY "Users can update their projects" ON projects
    FOR UPDATE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'admin')
        )
    );

-- Allow delete only if creator
CREATE POLICY "Users can delete their projects" ON projects
    FOR DELETE
    USING (created_by = auth.uid());

-- 3. Test: Try to select projects
SELECT
    id,
    name,
    code,
    created_by,
    'SUCCESS - Policy works!' as status
FROM projects;

-- 4. Show which projects current user should see
SELECT
    p.id,
    p.name,
    p.created_by,
    pm.role as member_role,
    CASE
        WHEN p.created_by = auth.uid() THEN 'Creator'
        WHEN pm.user_id IS NOT NULL THEN 'Member'
        ELSE 'No Access'
    END as access_reason
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
WHERE p.created_by = auth.uid() OR pm.user_id = auth.uid();
