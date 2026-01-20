-- ============================================
-- ADD FOLDERS/SUITES STRUCTURE
-- Run this in Supabase SQL Editor
-- ============================================

-- Create test suites table (folders)
CREATE TABLE test_suites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add suite_id to test_cases
ALTER TABLE test_cases 
ADD COLUMN suite_id UUID REFERENCES test_suites(id) ON DELETE SET NULL,
ADD COLUMN position INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX idx_test_suites_project ON test_suites(project_id);
CREATE INDEX idx_test_suites_parent ON test_suites(parent_id);
CREATE INDEX idx_test_cases_suite ON test_cases(suite_id);

-- Enable RLS
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_suites
CREATE POLICY "Users can manage test suites" ON test_suites 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_suites.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Trigger for auto-set created_by
CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON test_suites
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

-- Trigger for updated_at
CREATE TRIGGER update_test_suites_updated_at BEFORE UPDATE ON test_suites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION DATA
-- ============================================
-- Optional: Create default "Root" suite for existing test cases
-- Uncomment if you want to migrate existing data

/*
INSERT INTO test_suites (project_id, name, description, position)
SELECT DISTINCT 
    project_id, 
    'Uncategorized', 
    'Default suite for existing test cases',
    0
FROM test_cases
ON CONFLICT DO NOTHING;

-- Move existing test cases to default suite
UPDATE test_cases tc
SET suite_id = (
    SELECT ts.id 
    FROM test_suites ts 
    WHERE ts.project_id = tc.project_id 
    AND ts.name = 'Uncategorized' 
    LIMIT 1
)
WHERE suite_id IS NULL;
*/

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'test_suites created' as status, COUNT(*) FROM test_suites;
