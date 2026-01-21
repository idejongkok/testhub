-- TEMPORARY: Disable RLS to test if that's the issue
-- WARNING: This makes projects visible to all users!
-- Only use for debugging, re-enable RLS after testing

-- Disable RLS on projects table
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Now try to fetch projects from your app
-- If projects appear, the issue is with RLS policies
-- If they still don't appear, the issue is elsewhere

-- To re-enable RLS after testing, run:
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
