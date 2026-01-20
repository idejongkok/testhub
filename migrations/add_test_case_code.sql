-- ============================================
-- Migration: Add Test Case Code Column
-- ============================================
-- This migration adds a human-readable code to test cases
-- Format: TC-001, TC-002, etc. (per project)
-- ============================================

-- Step 1: Add test_case_code column
ALTER TABLE test_cases
ADD COLUMN test_case_code VARCHAR(50);

-- Step 2: Create index for faster lookups
CREATE INDEX idx_test_cases_code ON test_cases(project_id, test_case_code);

-- Step 3: Add unique constraint (code must be unique per project)
ALTER TABLE test_cases
ADD CONSTRAINT unique_test_case_code_per_project
UNIQUE (project_id, test_case_code);

-- Step 4: Create function to generate next test case code
CREATE OR REPLACE FUNCTION generate_test_case_code(p_project_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_max_number INTEGER;
    v_new_code VARCHAR(50);
BEGIN
    -- Get the highest number currently used in this project
    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(test_case_code FROM 'TC-(\d+)') AS INTEGER
            )
        ),
        0
    )
    INTO v_max_number
    FROM test_cases
    WHERE project_id = p_project_id
    AND test_case_code IS NOT NULL
    AND test_case_code ~ '^TC-\d+$';

    -- Generate new code with zero-padded number
    v_new_code := 'TC-' || LPAD((v_max_number + 1)::TEXT, 3, '0');

    RETURN v_new_code;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Backfill existing test cases with codes
-- This will assign TC-001, TC-002, etc. to existing test cases in each project
DO $$
DECLARE
    project_record RECORD;
    test_case_record RECORD;
    counter INTEGER;
BEGIN
    -- Loop through each project
    FOR project_record IN SELECT id FROM projects LOOP
        counter := 1;

        -- Loop through test cases in this project (ordered by creation date)
        FOR test_case_record IN
            SELECT id
            FROM test_cases
            WHERE project_id = project_record.id
            AND test_case_code IS NULL
            ORDER BY created_at ASC
        LOOP
            -- Update test case with generated code
            UPDATE test_cases
            SET test_case_code = 'TC-' || LPAD(counter::TEXT, 3, '0')
            WHERE id = test_case_record.id;

            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Step 6: Make test_case_code NOT NULL after backfilling
ALTER TABLE test_cases
ALTER COLUMN test_case_code SET NOT NULL;

-- Step 7: Create trigger to auto-generate code for new test cases
CREATE OR REPLACE FUNCTION auto_generate_test_case_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if code is not provided
    IF NEW.test_case_code IS NULL THEN
        NEW.test_case_code := generate_test_case_code(NEW.project_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_test_case_code
BEFORE INSERT ON test_cases
FOR EACH ROW
EXECUTE FUNCTION auto_generate_test_case_code();

-- ============================================
-- Verification Queries (Optional - Run to verify)
-- ============================================

-- Check test case codes by project
-- SELECT
--     p.name as project_name,
--     tc.test_case_code,
--     tc.title,
--     tc.created_at
-- FROM test_cases tc
-- JOIN projects p ON tc.project_id = p.id
-- ORDER BY p.name, tc.test_case_code;

-- Count test cases per project
-- SELECT
--     p.name as project_name,
--     COUNT(*) as total_test_cases,
--     MIN(tc.test_case_code) as first_code,
--     MAX(tc.test_case_code) as last_code
-- FROM test_cases tc
-- JOIN projects p ON tc.project_id = p.id
-- GROUP BY p.name;
