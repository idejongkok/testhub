# 🗄️ Database Setup Guide

## Quick Decision Tree

```
Do you have existing data you want to keep?
│
├─ YES → Use Option A (Migration)
│   └─ Run: migration-add-suites.sql
│
└─ NO → Use Option B (Fresh Start)
    └─ Run: clean-database.sql + database-schema.sql
```

---

## Option A: Migration (Keep Existing Data) ✅

**Use this if:**
- You have test cases you want to keep
- You're already using the app
- You want zero data loss

**Steps:**

### 1. Check Current State
```sql
-- In Supabase SQL Editor, run:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:**
- projects
- test_cases
- test_plans
- test_plan_cases
- test_runs
- test_run_results

### 2. Run Migration
```bash
# Copy content from: migration-add-suites.sql
# Paste in Supabase SQL Editor
# Click "Run"
```

**What it does:**
- Creates `test_suites` table
- Adds `suite_id` column to `test_cases`
- Adds `position` column to `test_cases`
- Sets up RLS policies
- Creates triggers

**What happens to existing data:**
- ✅ All existing test cases preserved
- ✅ `suite_id` = NULL (shows in "Uncategorized")
- ✅ Can move to suites later
- ✅ No data loss

### 3. Verify Migration
```sql
-- Check new table exists
SELECT COUNT(*) as suite_count FROM test_suites;

-- Check new columns exist
SELECT suite_id, position 
FROM test_cases 
LIMIT 1;
```

**Expected:**
- Query runs without error
- `suite_id` = NULL for existing cases
- `position` = 0 for existing cases

---

## Option B: Fresh Start (Recommended for New Users) 🔄

**Use this if:**
- You're just testing the app
- You want to import from Qase.io
- You have no important data yet
- You want the cleanest setup

**Steps:**

### 1. Clean Database
```bash
# Copy content from: clean-database.sql
# Paste in Supabase SQL Editor
# Click "Run"
```

**What it does:**
- Drops ALL tables
- Drops ALL functions
- Drops ALL triggers
- Complete clean slate

### 2. Create Fresh Schema
```bash
# Copy content from: database-schema.sql
# Paste in Supabase SQL Editor  
# Click "Run"
```

**What it creates:**
- All tables from scratch
- All RLS policies
- All triggers
- All functions
- Latest schema version

### 3. Verify Setup
```sql
-- Should show all 7 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:**
1. projects
2. test_cases
3. test_plans
4. test_plan_cases
5. test_runs
6. test_run_results
7. **test_suites** ← NEW!

### 4. Test with Sample Data
```sql
-- Create test project
INSERT INTO projects (name, code, description)
VALUES ('Test Project', 'TEST', 'Sample project');

-- Verify
SELECT * FROM projects;
```

---

## Database Schema Overview

### Tables & Relationships

```
projects (root)
├─ test_suites (folders/hierarchy)
│  ├─ parent_id → self (nested folders)
│  └─ project_id → projects
│
├─ test_cases (test cases)
│  ├─ suite_id → test_suites (optional)
│  └─ project_id → projects
│
├─ test_plans (test plans)
│  └─ project_id → projects
│
├─ test_plan_cases (junction)
│  ├─ test_plan_id → test_plans
│  └─ test_case_id → test_cases
│
├─ test_runs (execution runs)
│  └─ project_id → projects
│
└─ test_run_results (individual results)
   ├─ test_run_id → test_runs
   └─ test_case_id → test_cases
```

### New in This Version

**test_suites table:**
```sql
id              uuid (PK)
project_id      uuid (FK → projects)
parent_id       uuid (FK → test_suites) -- for nesting
name            varchar(255)
description     text
position        integer
created_by      uuid (FK → auth.users)
created_at      timestamp
updated_at      timestamp
```

**test_cases updates:**
```sql
+ suite_id      uuid (FK → test_suites, nullable)
+ position      integer (for ordering)
```

---

## Troubleshooting

### Migration Fails

**Error: "relation already exists"**
```
Solution: Table already exists, migration already ran
Action: Skip migration, you're good to go
```

**Error: "column already exists"**
```
Solution: Columns already added
Action: Skip migration
```

**Error: "permission denied"**
```
Solution: RLS policy issue
Action: 
1. Go to Supabase Dashboard
2. Authentication → Policies
3. Check test_suites policies exist
```

### Fresh Start Issues

**Error: "cannot drop table ... because other objects depend on it"**
```
Solution: Add CASCADE
Action: Use clean-database.sql (already has CASCADE)
```

**Error: "function does not exist"**
```
Solution: Run full database-schema.sql
Action: Contains all functions
```

---

## After Database Setup

### 1. Update .env
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Install & Run
```bash
npm install
npm run dev
```

### 3. Test the App
1. Sign up / Login
2. Create project
3. Create suite
4. Create test case
5. Or import from Qase.io CSV

---

## Which Option Should I Use?

### Use Option A (Migration) if:
- ✅ You already have test data
- ✅ You're updating existing installation
- ✅ You want zero downtime
- ✅ You can't lose data

### Use Option B (Fresh Start) if:
- ✅ First time setup
- ✅ Just testing the app
- ✅ About to import from Qase.io
- ✅ Want cleanest setup
- ✅ No important data yet

---

## FAQ

**Q: Can I rollback migration?**
A: Yes, but you'll lose suite structure. Just drop test_suites table and suite_id column.

**Q: Will migration affect test runs?**
A: No, test_runs and test_run_results unchanged.

**Q: Can I migrate later?**
A: Yes, migration can run anytime.

**Q: What if I'm already using tree structure?**
A: You're good! No need to run anything.

**Q: Fresh start will delete my account?**
A: No, only project/test data. Auth separate.

---

## Recommended Path for You

Based on your situation:

**Scenario 1: Brand new, want to import Qase.io**
```bash
1. Run: clean-database.sql
2. Run: database-schema.sql
3. Import: RR-2026-01-12.csv
✅ Clean setup with 580 test cases
```

**Scenario 2: Already have some test data**
```bash
1. Run: migration-add-suites.sql
2. Organize existing tests into suites
3. Import more from CSV if needed
✅ Keep existing + add new
```

**Scenario 3: Not sure**
```bash
1. Export current data (manual backup)
2. Run: clean-database.sql
3. Run: database-schema.sql
4. Import everything fresh
✅ Safest approach
```

---

**Files:**
- `clean-database.sql` - Option B step 1
- `database-schema.sql` - Option B step 2
- `migration-add-suites.sql` - Option A
- `fix-rls-policies.sql` - If RLS issues

**Need help?** Check error messages and refer to troubleshooting section above.
