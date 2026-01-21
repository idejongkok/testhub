# Fix Result Status Enum

## Problem
When creating a test run from a test plan, you may encounter this error:
```
Failed to copy test cases to test run: new row for relation "test_run_results"
violates check constraint "test_run_results_result_status_check"
```

## Root Cause
The database enum `result_status` is missing the `'untested'` value, which is the default status for new test run results.

## Solution
Run the migration file: `fix-result-status-enum.sql`

This will:
1. Check if 'untested' exists in the result_status enum
2. Add it if missing
3. Verify the enum values

## How to Apply

### Option 1: Via Supabase Dashboard
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-result-status-enum.sql`
4. Click "Run"

### Option 2: Via psql
```bash
psql -h your-host -U postgres -d your-database -f migrations/fix-result-status-enum.sql
```

## Code Changes
The application code has been updated to omit the `result_status` field when inserting test run results, allowing the database to use its default value. This provides better compatibility with different enum configurations.
