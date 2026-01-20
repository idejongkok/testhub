-- Migration: Add Project Members (Team Collaboration)
-- This allows multiple users to access the same project

-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_members
CREATE POLICY "Users can view members of their projects" ON project_members
    FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners and admins can add members" ON project_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_id = project_members.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Project owners and admins can remove members" ON project_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin')
        )
    );

-- Update projects RLS policies to include team members
DROP POLICY IF EXISTS "Users can view projects they created" ON projects;
CREATE POLICY "Users can view their projects" ON projects
    FOR SELECT
    USING (
        created_by = auth.uid() OR
        id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their projects" ON projects;
CREATE POLICY "Users can update projects they own or admin" ON projects
    FOR UPDATE
    USING (
        created_by = auth.uid() OR
        id IN (
            SELECT project_id FROM project_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "Users can delete their projects" ON projects;
CREATE POLICY "Users can delete projects they own" ON projects
    FOR DELETE
    USING (created_by = auth.uid());

-- Update test_cases RLS policies for team access
DROP POLICY IF EXISTS "Users can view test cases in their projects" ON test_cases;
CREATE POLICY "Users can view test cases in their projects" ON test_cases
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = test_cases.project_id
            AND (
                projects.created_by = auth.uid() OR
                projects.id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert test cases in their projects" ON test_cases;
CREATE POLICY "Users can insert test cases in their projects" ON test_cases
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = test_cases.project_id
            AND (
                projects.created_by = auth.uid() OR
                projects.id IN (
                    SELECT project_id FROM project_members
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can update test cases in their projects" ON test_cases;
CREATE POLICY "Users can update test cases in their projects" ON test_cases
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = test_cases.project_id
            AND (
                projects.created_by = auth.uid() OR
                projects.id IN (
                    SELECT project_id FROM project_members
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete test cases in their projects" ON test_cases;
CREATE POLICY "Users can delete test cases in their projects" ON test_cases
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = test_cases.project_id
            AND (
                projects.created_by = auth.uid() OR
                projects.id IN (
                    SELECT project_id FROM project_members
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
                )
            )
        )
    );

-- Function to automatically add project creator as owner
CREATE OR REPLACE FUNCTION add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add owner when project is created
DROP TRIGGER IF EXISTS trigger_add_project_owner ON projects;
CREATE TRIGGER trigger_add_project_owner
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION add_project_owner();

-- Add existing project creators as owners (for existing projects)
INSERT INTO project_members (project_id, user_id, role)
SELECT id, created_by, 'owner'
FROM projects
WHERE created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON project_members TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
