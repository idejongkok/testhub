# Feature: Test Run Management - Individual & Bulk Actions

## Overview
Feature ini menambahkan kemampuan untuk manage test cases dalam Test Run dengan actions individual dan bulk, serta add/remove test cases.

## Features

### 1. **Test Run Detail View**
- List semua test cases dalam test run
- Menampilkan status setiap test case (Passed, Failed, Blocked, Skipped, Untested)
- Statistics summary (total, passed, failed, blocked, skipped, untested)
- Checkbox untuk select multiple test cases

### 2. **Individual Actions**
Quick action buttons untuk setiap test case:
- ✓ **Pass** - Mark test case as passed
- ✗ **Fail** - Mark test case as failed
- ⊘ **Block** - Mark test case as blocked
- ↷ **Skip** - Mark test case as skipped
- 🗑️ **Remove** - Remove test case dari test run

### 3. **Bulk Actions**
Actions untuk multiple test cases sekaligus:
- **Bulk Pass** - Mark semua selected test cases as passed
- **Bulk Fail** - Mark semua selected test cases as failed
- **Bulk Block** - Mark semua selected test cases as blocked
- **Bulk Skip** - Mark semua selected test cases as skipped
- **Bulk Remove** - Remove semua selected test cases dari test run

### 4. **Add Test Cases**
- Search dan browse available test cases
- Filter test cases yang belum ada di test run
- Click to add test case ke test run
- Auto-filter test cases yang sudah ditambahkan

### 5. **Status Filter**
- Filter test cases by status (All, Passed, Failed, Blocked, Skipped, Untested)
- Real-time count untuk setiap status di dropdown
- Select All bekerja dengan filtered results

### 6. **Auto-tracking Executor**
Saat melakukan action (individual/bulk):
- Otomatis record `executed_by` (user yang melakukan action)
- Otomatis record `executed_at` (timestamp action)

## Components

### New Component: `TestRunDetail.tsx`
Location: `src/components/TestRunDetail.tsx`

**Props:**
```typescript
interface TestRunDetailProps {
  testRun: TestRun           // Test run object
  onClose: () => void        // Callback saat close modal
  onUpdate: () => void       // Callback saat ada perubahan
}
```

**Features:**
- Full modal view dengan scrollable content
- Real-time statistics
- Bulk action toolbar (muncul saat ada selection)
- Add test cases modal
- Individual quick actions per test case

### Updated Component: `TestRunsPage.tsx`
Location: `src/pages/TestRunsPage.tsx`

**Changes:**
- Added **"Manage"** button di setiap test run card
- Import TestRunDetail component
- Bug fixes: `status` → `run_status`, `not_executed` → `untested`

## UI/UX

### Test Run Card
```
┌─────────────────────────────────────────────────┐
│ Test Run Sprint 1.0                            │
│ Test all features for sprint 1.0              │
│                                                │
│ [in_progress] Environment: staging             │
│ Created: Jan 19, 2026                          │
│                                                │
│ [Manage] [Report] [Execute] [Edit] [Delete]   │
└─────────────────────────────────────────────────┘
```

### Test Run Detail Modal
```
┌─────────────────────────────────────────────────────────────┐
│ Test Run Sprint 1.0                              [X]       │
│ Test all features for sprint 1.0                           │
│ ✓ 5  ✗ 2  ⊘ 1  ↷ 0  − 3  Total: 11                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [BULK ACTIONS BAR - appears when items selected]           │
│ 3 selected [Pass] [Fail] [Block] [Skip] [Remove]          │
│                                                             │
│ [+ Add Test Cases]  [ ] Select All                         │
│                              Filter: [All (11) ▼]          │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ [ ] ✓  Login with valid credentials                 │   │
│ │        [API] [High]                                  │   │
│ │        [✓] [✗] [⊘] [↷] [🗑️]                         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ [✓] −  Test password reset                           │   │
│ │        [Web] [Medium]                                │   │
│ │        [✓] [✗] [⊘] [↷] [🗑️]                         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage Flow

### 1. Quick Status Update (Individual)
1. User clicks **"Manage"** pada test run
2. Test Run Detail modal terbuka
3. User click icon Pass/Fail/Block/Skip pada test case
4. Status langsung terupdate
5. Executor info (user + timestamp) otomatis tersimpan

### 2. Bulk Status Update
1. User checks multiple test cases
2. Bulk action toolbar muncul
3. User click salah satu bulk action (Pass/Fail/Block/Skip)
4. Konfirmasi jika diperlukan
5. Semua selected test cases status terupdate
6. Executor info otomatis tersimpan untuk semua

### 3. Add Test Cases to Test Run
1. User clicks **"Add Test Cases"** button
2. Modal dengan list available test cases muncul
3. User dapat search test cases
4. User click test case untuk add
5. Test case langsung masuk ke test run dengan status "untested"

### 4. Remove Test Cases
**Individual:**
- Click trash icon pada test case
- Confirm removal
- Test case removed dari test run (tapi tidak dihapus dari database)

**Bulk:**
- Select multiple test cases
- Click "Remove" di bulk action toolbar
- Confirm removal
- All selected test cases removed dari test run

## Database Changes

**No schema changes required!**

Semua field yang diperlukan sudah ada:
- `test_run_results.result_status` - untuk status
- `test_run_results.executed_by` - untuk executor tracking
- `test_run_results.executed_at` - untuk timestamp
- `test_run_results.test_run_id` - untuk relasi
- `test_run_results.test_case_id` - untuk relasi

## Code Examples

### Individual Action
```typescript
const handleStatusChange = async (resultId: string, status: ResultStatus) => {
  await supabase
    .from('test_run_results')
    .update({
      result_status: status,
      executed_by: user?.id,
      executed_at: new Date().toISOString(),
    })
    .eq('id', resultId)

  fetchResults()
  onUpdate()
}
```

### Bulk Action
```typescript
const handleBulkStatusChange = async (status: ResultStatus) => {
  if (selectedIds.size === 0) {
    alert('Please select at least one test case')
    return
  }

  const updates = Array.from(selectedIds).map(id =>
    supabase
      .from('test_run_results')
      .update({
        result_status: status,
        executed_by: user?.id,
        executed_at: new Date().toISOString(),
      })
      .eq('id', id)
  )

  await Promise.all(updates)
  setSelectedIds(new Set())
  fetchResults()
  onUpdate()
}
```

### Add Test Case
```typescript
const handleAddTestCases = async (testCaseIds: string[]) => {
  const inserts = testCaseIds.map(testCaseId => ({
    test_run_id: testRun.id,
    test_case_id: testCaseId,
    result_status: 'untested' as ResultStatus,
  }))

  await supabase.from('test_run_results').insert(inserts)
  setShowAddModal(false)
  fetchResults()
  onUpdate()
}
```

## Benefits

1. **Faster Testing** - Quick actions tanpa perlu masuk execution mode
2. **Bulk Operations** - Update multiple test cases sekaligus
3. **Flexibility** - Add/remove test cases kapan saja
4. **Tracking** - Semua action ter-record dengan executor dan timestamp
5. **Better UX** - Clear visual feedback dan statistics
6. **Easy Filtering** - Quickly find test cases by status

## Workflow Integration

### Before Execution
1. **Setup**: Add test cases ke test run
2. **Review**: Check list test cases yang akan dijalankan
3. **Adjust**: Remove test cases yang tidak relevan

### During Execution
1. **Quick Update**: Mark Pass/Fail langsung tanpa detail
2. **Bulk Update**: Mark multiple known results
3. **Detail Update**: Use "Execute" mode untuk detailed results

### After Execution
1. **Review**: Check statistics
2. **Adjust**: Mark remaining test cases
3. **Report**: Generate report dengan complete data

## Notes

- Semua actions auto-save, tidak perlu "Save" button
- Selected state di-clear setelah bulk action
- Add modal otomatis filter test cases yang sudah ditambahkan
- Statistics update real-time setelah setiap action
- Compatible dengan existing Execute mode

## Future Enhancements

Possible improvements:
- ✅ Filter test cases by status (DONE!)
- Sort test cases by priority/type/title
- Export selected test cases
- Clone test cases to another run
- Assign test cases to specific users
- Add notes/comments via quick action
- Filter by test type (API, Web, Mobile)
- Filter by priority (Critical, High, Medium, Low)
