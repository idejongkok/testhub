# Fix Result Status Enum

## Problem
When creating a test run from a test plan, you may encounter this error:
```
Failed to copy test cases to test run: new row for relation "test_run_results"
violates check constraint "test_run_results_result_status_check"
```

Or this error:
```
ERROR: type "result_status" does not exist
```

## Root Cause
The database enum `result_status` either:
1. Doesn't exist at all, OR
2. Exists but is missing the `'untested'` value

This is the default status for new test run results.

## Solution

### Step 1: Diagnose the Issue (Optional)
First, run `check-result-status-column.sql` to see the current state:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `check-result-status-column.sql`
3. Click "Run"
4. Review the output to understand what's missing

### Step 2: Apply the Fix
Run the migration file: `fix-result-status-enum.sql`

This will:
1. Create the `result_status` type if it doesn't exist
2. Add 'untested' value if the type exists but the value is missing
3. Verify the enum values

### How to Apply

#### Via Supabase Dashboard (Recommended)
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `fix-result-status-enum.sql`
4. Click **Run**
5. Check the output - you should see a message confirming the fix

#### Via psql
```bash
psql -h your-host -U postgres -d your-database -f migrations/fix-result-status-enum.sql
```

### Step 3: Update Table Column (If Needed)
If the `result_status` column in `test_run_results` table is using TEXT or VARCHAR instead of the enum type, you'll need to alter the column. The migration script will tell you if this is needed.

## Code Changes
The application code has been updated to omit the `result_status` field when inserting test run results, allowing the database to use its default value. This provides better compatibility with different enum configurations.

## Expected Output
After running the migration, you should see:
```
NOTICE: Created result_status enum type
```
or
```
NOTICE: result_status type already exists
NOTICE: untested already exists in result_status enum
```

And a list of current enum values:
```
untested
in_progress
passed
failed
blocked
skipped
```
