-- ============================================
-- QA Test Management System - Database Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE test_type AS ENUM ('functional_web', 'functional_mobile', 'api');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE status AS ENUM ('draft', 'ready', 'deprecated');
CREATE TYPE run_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE result_status AS ENUM ('passed', 'failed', 'blocked', 'skipped', 'in_progress', 'untested');

-- ============================================
-- TABLES
-- ============================================

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Cases Table
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    test_type test_type NOT NULL,
    priority priority DEFAULT 'medium',
    status status DEFAULT 'draft',
    preconditions TEXT,
    steps JSONB, -- Array of {step_number, action, expected_result}
    expected_result TEXT,
    -- API specific fields
    api_method VARCHAR(10), -- GET, POST, PUT, DELETE, etc
    api_endpoint TEXT,
    api_headers JSONB,
    api_body JSONB,
    api_expected_status INTEGER,
    api_expected_response JSONB,
    -- Mobile specific fields
    mobile_platform VARCHAR(20), -- iOS, Android, Both
    mobile_device TEXT,
    -- Metadata
    tags TEXT[],
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Plans Table
CREATE TABLE test_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Plan Cases (Many-to-Many)
CREATE TABLE test_plan_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_plan_id UUID REFERENCES test_plans(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_plan_id, test_case_id)
);

-- Test Runs Table
CREATE TABLE test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    test_plan_id UUID REFERENCES test_plans(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(100), -- staging, production, dev
    run_status run_status DEFAULT 'not_started',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Run Results
CREATE TABLE test_run_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    result_status result_status DEFAULT 'untested',
    actual_result TEXT,
    comments TEXT,
    attachments JSONB, -- Array of {type: 'upload'|'link', url: string, name: string}
    execution_time INTEGER, -- in seconds
    executed_by UUID REFERENCES auth.users(id),
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_run_id, test_case_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_test_cases_project ON test_cases(project_id);
CREATE INDEX idx_test_cases_type ON test_cases(test_type);
CREATE INDEX idx_test_cases_status ON test_cases(status);
CREATE INDEX idx_test_plans_project ON test_plans(project_id);
CREATE INDEX idx_test_runs_project ON test_runs(project_id);
CREATE INDEX idx_test_run_results_run ON test_run_results(test_run_id);
CREATE INDEX idx_test_run_results_case ON test_run_results(test_case_id);

-- ============================================
-- STORAGE BUCKET
-- ============================================

-- Create storage bucket for test attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('test-attachments', 'test-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_plan_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_run_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - PROJECTS
-- ============================================

CREATE POLICY "Users can view projects they created" ON projects
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert projects" ON projects
    FOR INSERT WITH CHECK (created_by IS NULL OR created_by = auth.uid());

CREATE POLICY "Users can update their projects" ON projects
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their projects" ON projects
    FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES - TEST CASES
-- ============================================

CREATE POLICY "Users can view test cases in their projects" ON test_cases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert test cases in their projects" ON test_cases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update test cases in their projects" ON test_cases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete test cases in their projects" ON test_cases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES - TEST PLANS
-- ============================================

CREATE POLICY "Users can manage test plans" ON test_plans 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_plans.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES - TEST PLAN CASES
-- ============================================

CREATE POLICY "Users can manage test plan cases" ON test_plan_cases 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM test_plans tp
            JOIN projects p ON p.id = tp.project_id
            WHERE tp.id = test_plan_cases.test_plan_id 
            AND p.created_by = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES - TEST RUNS
-- ============================================

CREATE POLICY "Users can manage test runs" ON test_runs 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_runs.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES - TEST RUN RESULTS
-- ============================================

CREATE POLICY "Users can manage test run results" ON test_run_results 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM test_runs tr
            JOIN projects p ON p.id = tr.project_id
            WHERE tr.id = test_run_results.test_run_id 
            AND p.created_by = auth.uid()
        )
    );

-- ============================================
-- STORAGE POLICIES
-- ============================================

CREATE POLICY "Users can upload test attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'test-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Anyone can view test attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'test-attachments');

CREATE POLICY "Users can delete their test attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'test-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to auto-set created_by field
CREATE OR REPLACE FUNCTION auto_set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_plans_updated_at BEFORE UPDATE ON test_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_runs_updated_at BEFORE UPDATE ON test_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_run_results_updated_at BEFORE UPDATE ON test_run_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for auto-setting created_by
CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON test_cases
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON test_plans
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON test_runs
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- You can uncomment and modify this to insert sample data
/*
-- Insert sample project (replace user_id with your actual auth.users id)
INSERT INTO projects (name, code, description, created_by) 
VALUES (
    'Sample QA Project', 
    'SQA', 
    'Sample project for testing', 
    'your-user-id-here'
);

-- Insert sample test case
INSERT INTO test_cases (
    project_id, 
    title, 
    description, 
    test_type, 
    priority, 
    status,
    created_by
) VALUES (
    (SELECT id FROM projects WHERE code = 'SQA' LIMIT 1),
    'Login with valid credentials',
    'Test user can login successfully with valid username and password',
    'functional_web',
    'high',
    'ready',
    'your-user-id-here'
);
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify your setup:
/*
SELECT 'Projects' as table_name, COUNT(*) as count FROM projects
UNION ALL
SELECT 'Test Cases', COUNT(*) FROM test_cases
UNION ALL
SELECT 'Test Plans', COUNT(*) FROM test_plans
UNION ALL
SELECT 'Test Runs', COUNT(*) FROM test_runs
UNION ALL
SELECT 'Test Run Results', COUNT(*) FROM test_run_results;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'test_cases', 'test_plans', 'test_runs', 'test_run_results');

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'test-attachments';
*/

-- ============================================
-- COMPLETE!
-- ============================================
-- Your database is now ready for the QA Test Management System
-- Next steps:
-- 1. Copy your Supabase URL and anon key
-- 2. Update your .env file
-- 3. Run npm install && npm run dev
-- ============================================
