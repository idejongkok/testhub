-- Debug: Check current state of projects and members

-- 1. Check current user ID
SELECT auth.uid() as current_user_id;

-- 2. Check all projects
SELECT
    id,
    name,
    code,
    created_by,
    created_at
FROM projects
ORDER BY created_at DESC;

-- 3. Check all project_members
SELECT
    pm.id,
    pm.project_id,
    pm.user_id,
    pm.role,
    p.name as project_name,
    pm.created_at
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
ORDER BY pm.created_at DESC;

-- 4. Check which projects current user should see (according to RLS)
SELECT
    p.id,
    p.name,
    p.code,
    p.created_by,
    CASE
        WHEN p.created_by = auth.uid() THEN 'creator'
        WHEN EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        ) THEN 'member'
        ELSE 'no_access'
    END as access_type
FROM projects p;

-- 5. Check user_profiles table exists and has data
SELECT id, email, full_name FROM user_profiles LIMIT 10;
