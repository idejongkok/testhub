-- Update test cases to set suite_id where it's currently NULL
-- Suite ID: 345411ea-f70d-4d4f-983f-0e44cdf3dce4

-- Option 1: Update ALL test cases that don't have a suite_id
UPDATE test_cases
SET suite_id = '345411ea-f70d-4d4f-983f-0e44cdf3dce4'
WHERE suite_id IS NULL;

-- Check results
SELECT
    COUNT(*) as total_updated
FROM test_cases
WHERE suite_id = '345411ea-f70d-4d4f-983f-0e44cdf3dce4';

-- Verify which test cases were updated
SELECT
    id,
    title,
    suite_id,
    created_at
FROM test_cases
WHERE suite_id = '345411ea-f70d-4d4f-983f-0e44cdf3dce4'
ORDER BY created_at DESC
LIMIT 10;
