# Database Migrations

SQL migration scripts for TestHub database.

## 📁 Structure

```
migrations/
├── docs/                    Documentation
├── result-status/           Result status enum fixes
├── rls-policies/            Row Level Security policies
├── utilities/               Utility scripts
└── *.sql                    Core schema migrations
```

## 🚀 Quick Fixes

### Cannot create test run
```
ERROR: violates check constraint "test_run_results_result_status_check"
```
**Fix:** Run `result-status/check-and-fix-result-status-column.sql`

### Cannot access data (RLS issues)
**Fix:** Run `rls-policies/fix-rls-final.sql`

### Clean up uncategorized test cases
**Fix:** Run `utilities/delete-uncategorized-testcases.sql`

## 📋 How to Apply

**Supabase Dashboard:**
1. SQL Editor → New Query
2. Copy migration file content
3. Run
4. Check output

**Command line:**
```bash
psql -h HOST -U postgres -d DB -f migrations/FILE.sql
```

## 📚 Documentation

Detailed guides in `docs/` folder:
- `README-fix-result-status.md` - Complete result_status fix guide

---

*TestHub by Uno - Ide Jongkok*
