-- ============================================
-- QA TEST MANAGEMENT - DATABASE SCHEMA
-- Version: 1.1 (with test_suites)
-- ============================================

-- ============================================
-- ENUMS (Create only if not exists)
-- ============================================

-- Drop and recreate to ensure latest values
DO $$ BEGIN
    CREATE TYPE test_type AS ENUM ('functional_web', 'functional_mobile', 'api');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status AS ENUM ('draft', 'ready', 'deprecated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE run_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE result_status AS ENUM ('untested', 'in_progress', 'passed', 'failed', 'blocked', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Suites (Folders/Tree structure)
CREATE TABLE IF NOT EXISTS test_suites (
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

-- Test Cases
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    suite_id UUID REFERENCES test_suites(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    test_type test_type NOT NULL,
    priority priority DEFAULT 'medium',
    status status DEFAULT 'draft',
    preconditions TEXT,
    steps JSONB,
    expected_result TEXT,
    api_method VARCHAR(10),
    api_endpoint VARCHAR(500),
    api_headers JSONB,
    api_body JSONB,
    api_expected_status INTEGER,
    api_expected_response JSONB,
    mobile_platform VARCHAR(50),
    mobile_device VARCHAR(100),
    tags TEXT[],
    position INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Plans
CREATE TABLE IF NOT EXISTS test_plans (
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

-- Test Plan Cases (Junction Table)
CREATE TABLE IF NOT EXISTS test_plan_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_plan_id UUID REFERENCES test_plans(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_plan_id, test_case_id)
);

-- Test Runs
CREATE TABLE IF NOT EXISTS test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(50) DEFAULT 'dev',
    run_status run_status DEFAULT 'pending',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Run Results
CREATE TABLE IF NOT EXISTS test_run_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    result_status result_status DEFAULT 'untested',
    actual_result TEXT,
    comments TEXT,
    execution_time INTEGER,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_run_id, test_case_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_test_suites_project ON test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_parent ON test_suites(parent_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_project ON test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_suite ON test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_plans_project ON test_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_project ON test_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_test_run_results_run ON test_run_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_run_results_case ON test_run_results(test_case_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_plan_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_run_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Projects policies
DROP POLICY IF EXISTS "Users can view projects they created" ON projects;
CREATE POLICY "Users can view projects they created" ON projects
    FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can insert projects" ON projects;
CREATE POLICY "Users can insert projects" ON projects
    FOR INSERT WITH CHECK (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their projects" ON projects;
CREATE POLICY "Users can update their projects" ON projects
    FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their projects" ON projects;
CREATE POLICY "Users can delete their projects" ON projects
    FOR DELETE USING (auth.uid() = created_by);

-- Test Suites policies
DROP POLICY IF EXISTS "Users can manage test suites" ON test_suites;
CREATE POLICY "Users can manage test suites" ON test_suites 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_suites.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Test Cases policies
DROP POLICY IF EXISTS "Users can view test cases in their projects" ON test_cases;
CREATE POLICY "Users can view test cases in their projects" ON test_cases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert test cases in their projects" ON test_cases;
CREATE POLICY "Users can insert test cases in their projects" ON test_cases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update test cases in their projects" ON test_cases;
CREATE POLICY "Users can update test cases in their projects" ON test_cases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete test cases in their projects" ON test_cases;
CREATE POLICY "Users can delete test cases in their projects" ON test_cases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_cases.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Test Plans policies
DROP POLICY IF EXISTS "Users can manage test plans" ON test_plans;
CREATE POLICY "Users can manage test plans" ON test_plans 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_plans.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Test Plan Cases policies
DROP POLICY IF EXISTS "Users can manage test plan cases" ON test_plan_cases;
CREATE POLICY "Users can manage test plan cases" ON test_plan_cases 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM test_plans tp
            JOIN projects p ON p.id = tp.project_id
            WHERE tp.id = test_plan_cases.test_plan_id 
            AND p.created_by = auth.uid()
        )
    );

-- Test Runs policies
DROP POLICY IF EXISTS "Users can manage test runs" ON test_runs;
CREATE POLICY "Users can manage test runs" ON test_runs 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = test_runs.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Test Run Results policies
DROP POLICY IF EXISTS "Users can manage test run results" ON test_run_results;
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
-- STORAGE (For attachments)
-- ============================================

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-attachments', 'test-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (Drop before create to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload test attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
CREATE POLICY "Users can upload attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'test-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Test attachments are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Attachments are publicly accessible" ON storage.objects;
CREATE POLICY "Attachments are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'test-attachments');

DROP POLICY IF EXISTS "Users can delete test attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their attachments" ON storage.objects;
CREATE POLICY "Users can delete their attachments" ON storage.objects
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
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_suites_updated_at ON test_suites;
CREATE TRIGGER update_test_suites_updated_at BEFORE UPDATE ON test_suites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_cases_updated_at ON test_cases;
CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_plans_updated_at ON test_plans;
CREATE TRIGGER update_test_plans_updated_at BEFORE UPDATE ON test_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_runs_updated_at ON test_runs;
CREATE TRIGGER update_test_runs_updated_at BEFORE UPDATE ON test_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_run_results_updated_at ON test_run_results;
CREATE TRIGGER update_test_run_results_updated_at BEFORE UPDATE ON test_run_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for auto-setting created_by
DROP TRIGGER IF EXISTS set_created_by_trigger ON projects;
CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

DROP TRIGGER IF EXISTS set_created_by_trigger ON test_suites;
CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON test_suites
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

DROP TRIGGER IF EXISTS set_created_by_trigger ON test_cases;
CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON test_cases
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

DROP TRIGGER IF EXISTS set_created_by_trigger ON test_plans;
CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON test_plans
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

DROP TRIGGER IF EXISTS set_created_by_trigger ON test_runs;
CREATE TRIGGER set_created_by_trigger BEFORE INSERT ON test_runs
    FOR EACH ROW EXECUTE FUNCTION auto_set_created_by();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Database schema created successfully!' as status;

-- Show created tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
