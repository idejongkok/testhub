# Feature: User Tracking for Test Cases and Executions

## Overview
Feature ini menambahkan tracking untuk:
1. **Creator** - User yang membuat test case
2. **Executor** - User yang melakukan execution testing pada test run

## Database Changes

### Migration File
Jalankan migration berikut di Supabase SQL Editor:
```
migrations/add-user-profiles.sql
```

Migration ini akan:
- Membuat tabel `user_profiles` untuk menyimpan informasi user
- Menambahkan trigger untuk auto-create profile saat user signup
- Backfill data user yang sudah ada
- Menambahkan RLS policies

### Schema Changes

#### New Table: `user_profiles`
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Existing Tables (No Changes Required)
- `test_cases.created_by` - sudah ada, references auth.users(id)
- `test_run_results.executed_by` - sudah ada, references auth.users(id)
- `test_run_results.executed_at` - sudah ada, timestamp execution

## Frontend Changes

### 1. Types Update
File: `src/types/database.ts`
- Menambahkan type `user_profiles` table

### 2. Test Cases Page
File: `src/pages/TestCasesPage.tsx`

**Changes:**
- Fetch test cases dengan join ke `user_profiles` untuk mendapatkan creator info
- Menampilkan "Created by: [email/name]" di setiap test case card

**Query:**
```typescript
const { data } = await supabase
  .from('test_cases')
  .select(`
    *,
    creator:user_profiles!test_cases_created_by_fkey(email, full_name)
  `)
  .eq('project_id', currentProject.id)
```

### 3. Test Run Report
File: `src/pages/TestRunReport.tsx`

**Changes:**
- Fetch test run results dengan join ke `user_profiles` untuk mendapatkan executor info
- Menampilkan "By: [email/name]" di setiap test result

**Query:**
```typescript
const { data } = await supabase
  .from('test_run_results')
  .select(`
    *,
    test_cases (id, title, test_type, priority, steps),
    executor:user_profiles!test_run_results_executed_by_fkey(email, full_name)
  `)
  .eq('test_run_id', id)
```

### 4. Test Run Executor
File: `src/components/TestRunExecutor.tsx`

**Changes:**
- Menyimpan `executed_by` dengan current user ID saat save result
- Menyimpan `executed_at` dengan timestamp saat save result

## How It Works

### 1. Test Case Creation
Saat user membuat test case:
1. Field `created_by` otomatis terisi dengan `auth.uid()` via trigger
2. Data disimpan di tabel `test_cases`
3. Saat fetch, data di-join dengan `user_profiles` untuk mendapat email/nama creator

### 2. Test Execution
Saat user execute test case:
1. Field `executed_by` diisi dengan current user ID
2. Field `executed_at` diisi dengan timestamp saat ini
3. Data disimpan di tabel `test_run_results`
4. Saat fetch report, data di-join dengan `user_profiles` untuk mendapat email/nama executor

## UI Display

### Test Cases Page
```
┌─────────────────────────────────────────┐
│ [API] [High]                           │
│ Test Login Functionality               │
│ Verify user can login with valid...   │
│ Created by: john@example.com          │ ← NEW!
└─────────────────────────────────────────┘
```

### Test Run Report
```
┌─────────────────────────────────────────┐
│ ✓ Test Login Functionality             │
│ Actual Result: Login successful        │
│ Comments: All steps passed             │
│                                        │
│                           5 min        │
│                By: john@example.com   │ ← NEW!
└─────────────────────────────────────────┘
```

## Installation Steps

1. **Run Migration**
   ```bash
   # Copy migration file content
   # Go to Supabase Dashboard > SQL Editor
   # Paste and run migrations/add-user-profiles.sql
   ```

2. **Verify Migration**
   ```sql
   -- Check if user_profiles table exists
   SELECT * FROM user_profiles;

   -- Check if trigger is working
   -- Create a new user and verify profile is auto-created
   ```

3. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy to your hosting platform
   ```

## Benefits

1. **Accountability** - Tahu siapa yang membuat test case dan siapa yang execute
2. **Tracking** - Bisa track kontribusi setiap team member
3. **History** - Audit trail untuk test case creation dan execution
4. **Collaboration** - Team bisa lihat siapa yang sudah/belum execute test

## Future Enhancements

Possible improvements:
- Filter test cases by creator
- Filter test results by executor
- Dashboard showing user statistics
- Notification saat test case di-assign
- Test case assignment feature

## Troubleshooting

### User profiles not showing
**Problem:** Creator/executor tidak muncul di UI

**Solution:**
1. Check migration sudah jalan: `SELECT COUNT(*) FROM user_profiles;`
2. Backfill user yang sudah ada:
   ```sql
   INSERT INTO user_profiles (id, email, full_name)
   SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
   FROM auth.users
   ON CONFLICT (id) DO NOTHING;
   ```

### RLS blocking queries
**Problem:** Query user_profiles return empty

**Solution:**
1. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'user_profiles';`
2. Verify policy exists: "Anyone can view user profiles"
3. If not, run migration again

### Foreign key constraint error
**Problem:** Cannot join test_cases with user_profiles

**Solution:**
1. Check foreign key name:
   ```sql
   SELECT constraint_name
   FROM information_schema.table_constraints
   WHERE table_name = 'test_cases' AND constraint_type = 'FOREIGN KEY';
   ```
2. Update query dengan foreign key name yang benar

## Notes

- Migration ini backward compatible - tidak mengubah schema existing tables
- User profiles auto-created saat signup via trigger
- RLS policies memperbolehkan semua user melihat profile (untuk collaboration)
- Existing test cases yang created_by = NULL akan show "Unknown creator"
