# 📥 Import Test Cases - Guide

## Overview

Import test cases dari Qase.io atau CSV format custom ke dalam aplikasi.

## Supported Formats

### 1. **Qase.io CSV Export** ✅
- Export langsung dari Qase.io
- Auto-parse suites structure
- Auto-parse test steps
- Support semua field (priority, tags, preconditions, etc)

### 2. **Custom Template** ✅
- Simplified format untuk manual entry
- Download template dari aplikasi
- Easy untuk bulk create

## How to Import

### Step 1: Prepare CSV

**From Qase.io:**
1. Login ke Qase.io
2. Go to Repository
3. Select project
4. Click "Export" → "CSV"
5. Download file

**Custom Format:**
1. Click "Import CSV" di aplikasi
2. Click "Download Template"
3. Fill in Excel/Google Sheets
4. Save as CSV

### Step 2: Import

1. Go to **Test Cases** page
2. Click **"Import CSV"** button (top right)
3. Click upload area atau drag & drop CSV file
4. Click **"Import Test Cases"**
5. Wait for process to complete
6. Review results

### Step 3: Review

Import akan show:
- ✅ Success count
- ✅ Suites created
- ❌ Errors (if any)

## CSV Format Details

### Qase.io Format

Columns yang di-parse:
```csv
title,description,preconditions,tags,priority,severity,status,
steps_actions,steps_result,steps_data,suite,suite_parent_id
```

**Example:**
```csv
title,description,priority,status,tags,suite
"Login with valid credentials","Test login functionality",high,ready,"login,auth","Authentication"
```

### Custom Template Format

Simplified format:
```csv
title,description,test_type,priority,status,preconditions,
step_1_action,step_1_expected,step_2_action,step_2_expected,
tags,suite_name
```

**Example:**
```csv
title,description,test_type,priority,status,suite_name
"Login test","Test login",functional_web,high,ready,"Auth Tests"
```

## Field Mapping

### Qase.io → Our App

| Qase Field | Our Field | Mapping Logic |
|------------|-----------|---------------|
| `priority` + `severity` | `priority` | blocker/critical → critical<br>major/high → high<br>minor/medium → medium<br>trivial/low → low |
| `type` | `test_type` | api → api<br>mobile → functional_mobile<br>other → functional_web |
| `status` | `status` | actual/ready → ready<br>deprecated → deprecated<br>draft → draft |
| `tags` | `tags` | Comma-separated → Array |
| `suite` | `suite_name` | Auto-create suite if not exists |
| `steps_actions` | `steps[].action` | Parse numbered list |
| `steps_result` | `steps[].expected_result` | Parse numbered list |

### Test Type Mapping

| CSV Value | Mapped To |
|-----------|-----------|
| `api`, `API`, `Api` | `api` |
| `mobile`, `Mobile`, `MOBILE` | `functional_mobile` |
| `web`, `Web`, `other`, `functional` | `functional_web` |

### Priority Mapping

| CSV Value | Mapped To |
|-----------|-----------|
| `blocker`, `critical`, `CRITICAL` | `critical` |
| `major`, `high`, `HIGH` | `high` |
| `minor`, `medium`, `normal`, `MEDIUM` | `medium` |
| `trivial`, `low`, `LOW` | `low` |

### Status Mapping

| CSV Value | Mapped To |
|-----------|-----------|
| `actual`, `ready`, `approved`, `READY` | `ready` |
| `deprecated`, `obsolete`, `DEPRECATED` | `deprecated` |
| `draft`, `DRAFT`, others | `draft` |

## Features

### ✅ Auto Suite Creation
- Suites mentioned in CSV will be auto-created
- Nested suites supported (via `suite_parent_id`)
- If suite exists, test case will be added to it

### ✅ Step Parsing
- Numbered lists auto-parsed
- Action + Expected Result paired
- Test data merged with action

### ✅ Tag Import
- Comma-separated tags parsed
- Whitespace trimmed
- Empty tags ignored

### ✅ Duplicate Handling
- Duplicate test case titles allowed (no unique constraint)
- Duplicate suites skipped gracefully

## Error Handling

### Common Errors

**"Failed to parse CSV"**
- Solution: Check CSV format, ensure valid UTF-8

**"Invalid test type"**
- Solution: Use: `functional_web`, `functional_mobile`, or `api`

**"Missing required field: title"**
- Solution: Every test case must have a title

**"Failed to import [title]"**
- Check: Database constraints, RLS policies, authentication

### Validation

Before import:
- ✅ File must be .csv
- ✅ Title is required
- ✅ Test type must be valid
- ✅ Priority must be valid
- ✅ Status must be valid

## Best Practices

### 1. **Clean Your Data**
```csv
❌ BAD: "Test login     ", "  high", "ready  "
✅ GOOD: "Test login", "high", "ready"
```

### 2. **Use Consistent Naming**
```csv
❌ BAD: Different suite names for same suite
  "Auth Tests", "Authentication Tests", "Auth test"
✅ GOOD: Same suite name
  "Authentication Tests", "Authentication Tests"
```

### 3. **Test with Small Batch First**
- Import 5-10 test cases first
- Verify format is correct
- Then import full dataset

### 4. **Backup Before Import**
- Export existing data first (future feature)
- Or test in staging environment

### 5. **Review Results**
- Check success count
- Read error messages
- Fix errors and re-import failed cases

## Performance

- **Small CSV** (<100 cases): ~5-10 seconds
- **Medium CSV** (100-500 cases): ~30-60 seconds  
- **Large CSV** (500+ cases): ~2-5 minutes

Progress is shown during import.

## Limitations

### Current Limitations
- Max file size: 10MB
- Max test cases per import: 1000 (recommended)
- No API-specific field import yet (future)
- No mobile-specific field import yet (future)

### Not Imported
From Qase.io format:
- `postconditions` (not in our schema)
- `parameters` (not in our schema)
- `milestone` (not in our schema)
- `is_flaky`, `is_muted` (not in our schema)
- `automation` status (not in our schema)

## Examples

### Example 1: Simple Import

**CSV:**
```csv
title,test_type,priority,status,suite_name
"Test login",functional_web,high,ready,"Auth"
"Test logout",functional_web,medium,ready,"Auth"
```

**Result:**
- Suite "Auth" created
- 2 test cases imported
- Both assigned to "Auth" suite

### Example 2: With Steps

**CSV:**
```csv
title,step_1_action,step_1_expected,step_2_action,step_2_expected
"Login test","Open login page","Page loads","Enter credentials","User logged in"
```

**Result:**
- Test case with 2 steps created
- Steps properly structured

### Example 3: From Qase.io

**Qase CSV:**
```csv
title,suite,suite_parent_id,steps_actions,steps_result,tags,priority
"Login","Auth Module",,"1. Open page
2. Enter creds","1. Page loads
2. Login success","login,smoke",high
```

**Result:**
- Suite "Auth Module" created
- Test case imported
- 2 steps parsed
- Tags: ["login", "smoke"]
- Priority: high

## Troubleshooting

### Import Button Disabled
- Check: File selected?
- Check: File is .csv?

### Import Hangs
- Large file? Wait longer
- Check browser console for errors
- Try smaller batch

### Some Cases Not Imported
- Check error messages
- Common: Invalid enum values
- Fix CSV and re-import

### Suites Not Created
- Check: `suite_name` or `suite` column exists
- Check: Suite name not empty
- Check: No special characters in suite name

## FAQ

**Q: Can I import API test details?**
A: Not yet from CSV. Create as basic test case, then edit to add API details.

**Q: Can I update existing test cases via import?**
A: No, import only creates new test cases.

**Q: What if suite already exists?**
A: Test case will be added to existing suite.

**Q: Can I import to specific suite?**
A: Yes, specify `suite_name` in CSV.

**Q: Encoding issues?**
A: Ensure CSV is UTF-8 encoded.

---

**Feature Status:** ✅ Production Ready
**Supported Since:** v1.1.0
