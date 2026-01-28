-- Migration: Add JIRA Integration
-- Description: Adds jira_configurations table and JIRA tracking fields to bugs table
-- Date: 2025-01-28

-- =====================================================
-- 1. Create jira_configurations table
-- =====================================================

CREATE TABLE IF NOT EXISTS jira_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    jira_base_url TEXT NOT NULL,
    jira_project_key TEXT NOT NULL,
    jira_email TEXT NOT NULL,
    jira_api_token TEXT NOT NULL,
    default_issue_type TEXT DEFAULT 'Bug',
    enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

-- =====================================================
-- 2. Add JIRA tracking columns to bugs table
-- =====================================================

-- Add jira_ticket_key column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bugs' AND column_name = 'jira_ticket_key'
    ) THEN
        ALTER TABLE bugs ADD COLUMN jira_ticket_key TEXT;
    END IF;
END $$;

-- Add jira_ticket_url column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bugs' AND column_name = 'jira_ticket_url'
    ) THEN
        ALTER TABLE bugs ADD COLUMN jira_ticket_url TEXT;
    END IF;
END $$;

-- Add jira_created_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bugs' AND column_name = 'jira_created_at'
    ) THEN
        ALTER TABLE bugs ADD COLUMN jira_created_at TIMESTAMPTZ;
    END IF;
END $$;

-- =====================================================
-- 3. Enable RLS on jira_configurations
-- =====================================================

ALTER TABLE jira_configurations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS Policies for jira_configurations
-- =====================================================

-- Policy: Project admins and owners can manage JIRA config
DROP POLICY IF EXISTS "Project admins can manage JIRA config" ON jira_configurations;
CREATE POLICY "Project admins can manage JIRA config" ON jira_configurations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = jira_configurations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin')
        )
    );

-- Policy: Project members can read JIRA config (to check if configured)
DROP POLICY IF EXISTS "Project members can read JIRA config" ON jira_configurations;
CREATE POLICY "Project members can read JIRA config" ON jira_configurations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = jira_configurations.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- =====================================================
-- 5. Create index for faster lookups
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_jira_configurations_project_id
    ON jira_configurations(project_id);

CREATE INDEX IF NOT EXISTS idx_bugs_jira_ticket_key
    ON bugs(jira_ticket_key)
    WHERE jira_ticket_key IS NOT NULL;

-- =====================================================
-- 6. Add updated_at trigger for jira_configurations
-- =====================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for jira_configurations
DROP TRIGGER IF EXISTS update_jira_configurations_updated_at ON jira_configurations;
CREATE TRIGGER update_jira_configurations_updated_at
    BEFORE UPDATE ON jira_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Verification
-- =====================================================

-- You can verify the migration by running:
-- SELECT * FROM jira_configurations;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'bugs' AND column_name LIKE 'jira%';
