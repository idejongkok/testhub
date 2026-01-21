# Fix Result Status Enum

## Problem

Creating test runs fails with:
```
ERROR: violates check constraint "test_run_results_result_status_check"
```
or
```
ERROR: type "result_status" does not exist
```

## Root Cause

The `result_status` column either:
- Uses wrong type (TEXT instead of enum)
- Missing `'untested'` value in enum

## Quick Fix

**Run:** `result-status/check-and-fix-result-status-column.sql`

This one script will:
- ✓ Check current state
- ✓ Fix enum type
- ✓ Convert column type
- ✓ Set default value
- ✓ Verify the fix

### How to Run

**Supabase Dashboard:**
1. SQL Editor
2. Copy `result-status/check-and-fix-result-status-column.sql`
3. Run
4. Check for success messages

## Alternative: Step by Step

1. **Diagnose:** `result-status/check-result-status-column.sql`
2. **Fix enum:** `result-status/fix-result-status-enum.sql`
3. **Fix column:** `result-status/check-and-fix-result-status-column.sql`

## Expected Result

After fix:
```
NOTICE: Successfully converted column to enum type
```

Enum values:
```
untested
in_progress
passed
failed
blocked
skipped
```

---

*TestHub by Uno - Ide Jongkok*
