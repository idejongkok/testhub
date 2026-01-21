-- Fix: Restore project access for existing users
-- This ensures all project creators can see their projects

-- First, let's check if there are any projects without members
-- Run this to see the issue:
-- SELECT p.id, p.name, p.created_by, COUNT(pm.id) as member_count
-- FROM projects p
-- LEFT JOIN project_members pm ON p.id = pm.project_id
-- GROUP BY p.id, p.name, p.created_by
-- HAVING COUNT(pm.id) = 0;

-- Add project creators as owners for projects that don't have any members yet
INSERT INTO project_members (project_id, user_id, role)
SELECT
    p.id as project_id,
    p.created_by as user_id,
    'owner' as role
FROM projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = p.id AND pm.user_id = p.created_by
  )
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Verify: Check that all projects now have at least one owner
SELECT
    p.id,
    p.name,
    p.code,
    p.created_by,
    COUNT(pm.id) as member_count
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
GROUP BY p.id, p.name, p.code, p.created_by
ORDER BY p.created_at DESC;
