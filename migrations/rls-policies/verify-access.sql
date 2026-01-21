-- Verify: Check if current user can see projects

-- 1. Get current user
SELECT auth.uid() as current_user_id;

-- 2. Check if user_id matches in project_members
SELECT
    pm.*,
    p.name as project_name,
    CASE
        WHEN pm.user_id = auth.uid() THEN 'MATCH'
        ELSE 'NO MATCH'
    END as user_match
FROM project_members pm
JOIN projects p ON p.id = pm.project_id;

-- 3. Test the exact RLS policy condition
SELECT
    p.id,
    p.name,
    p.code,
    p.created_by,
    p.created_by = auth.uid() as is_creator,
    EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ) as is_member,
    (p.created_by = auth.uid() OR
     p.id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    ) as should_have_access
FROM projects p;

-- 4. Try to SELECT from projects directly (this will apply RLS)
SELECT * FROM projects;

-- 5. Check all auth users
SELECT id, email FROM auth.users;
