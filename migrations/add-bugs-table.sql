-- ============================================
-- Migration: Add Bugs/Issues Table
-- ============================================
-- This migration creates a bugs table to track issues found during testing
-- ============================================

-- Create bug status enum
DO $$ BEGIN
    CREATE TYPE bug_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'wont_fix');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create bug severity enum
DO $$ BEGIN
    CREATE TYPE bug_severity AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create bugs table
CREATE TABLE IF NOT EXISTS bugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    test_run_id UUID REFERENCES test_runs(id) ON DELETE SET NULL,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
    test_run_result_id UUID REFERENCES test_run_results(id) ON DELETE SET NULL,

    -- Bug details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity bug_severity DEFAULT 'medium',
    status bug_status DEFAULT 'open',

    -- Reproduction
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,

    -- Environment
    environment VARCHAR(100),
    browser VARCHAR(100),
    device VARCHAR(100),
    os VARCHAR(100),

    -- Attachments and links
    attachments JSONB, -- Array of {type: 'upload'|'link', url: string, name: string}
    external_link VARCHAR(500), -- Link to Jira, GitHub, etc.

    -- Assignment and tracking
    assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_bugs_project ON bugs(project_id);
CREATE INDEX idx_bugs_test_run ON bugs(test_run_id);
CREATE INDEX idx_bugs_test_case ON bugs(test_case_id);
CREATE INDEX idx_bugs_status ON bugs(status);
CREATE INDEX idx_bugs_severity ON bugs(severity);
CREATE INDEX idx_bugs_assigned_to ON bugs(assigned_to);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;

-- Users can view bugs in their projects
CREATE POLICY "Users can view bugs in their projects" ON bugs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = bugs.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- Users can insert bugs in their projects
CREATE POLICY "Users can insert bugs in their projects" ON bugs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = bugs.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- Users can update bugs in their projects
CREATE POLICY "Users can update bugs in their projects" ON bugs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = bugs.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- Users can delete bugs in their projects
CREATE POLICY "Users can delete bugs in their projects" ON bugs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = bugs.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for updated_at
CREATE TRIGGER update_bugs_updated_at BEFORE UPDATE ON bugs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for auto-setting reported_by
CREATE OR REPLACE FUNCTION auto_set_bug_reporter()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reported_by IS NULL THEN
        NEW.reported_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_bug_reporter_trigger BEFORE INSERT ON bugs
    FOR EACH ROW EXECUTE FUNCTION auto_set_bug_reporter();

-- ============================================
-- VERIFICATION
-- ============================================

-- Check table exists
SELECT 'Bugs table created' as status, COUNT(*) as count FROM bugs;

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'bugs'
ORDER BY indexname;

-- ============================================
-- COMPLETE!
-- ============================================
-- Bugs table is ready for tracking issues found during testing
-- ============================================
