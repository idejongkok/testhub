# 🌳 Tree Structure Migration Guide

## Quick Start

### Step 1: Run Database Migration

```bash
# In Supabase SQL Editor, run:
```

Copy and paste content from `migration-add-suites.sql`

This creates:
- `test_suites` table for folders
- `suite_id` column in `test_cases`
- `position` column for ordering
- RLS policies
- Triggers

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run Development

```bash
npm run dev
```

## What's New

### ✅ Tree Structure UI
- Accordion/collapsible folders
- Nested suites (unlimited depth)
- Visual hierarchy with indentation
- Test case count per suite

### ✅ Suite Management
- Create suites (folders)
- Create sub-suites
- Edit/Delete suites
- Test cases can be uncategorized

### ✅ Quick Actions on Hover
- **Suite hover:**
  - ➕ Add test case to suite
  - 📁 Add sub-suite
  - ✏️ Edit suite
  - 🗑️ Delete suite
  
- **Test case hover:**
  - ✏️ Edit
  - 🗑️ Delete

### ✅ Detail Panel
- Click test case → View full details on right
- Click suite → View suite info
- Split-screen layout

## UI Features

### Left Sidebar (Tree)
- Search test cases
- Expand/collapse suites
- Quick action buttons (hover to reveal)
- Visual badges (type, status, priority)

### Right Panel (Details)
- Full test case information
- All fields displayed
- Edit button for quick access
- Responsive layout

## How to Use

### Create Suite
1. Click "+ New Suite"
2. Enter suite name
3. (Optional) Add description
4. Click "Create"

### Create Sub-Suite
1. Hover over parent suite
2. Click 📁 folder+ icon
3. Enter sub-suite name
4. Auto-assigned to parent

### Create Test Case in Suite
1. Hover over suite
2. Click ➕ plus icon
3. Test case form opens with suite pre-selected
4. Fill in details
5. Click "Create"

### Move Test Case to Suite
1. Click on test case to select
2. Click "Edit"
3. Change "Suite" dropdown
4. Click "Update"

### Expand/Collapse Suite
- Click ▶ or ▼ arrow next to suite name
- State persists during session

## Migration Notes

### Existing Test Cases
- All existing test cases → "Uncategorized" section
- Still fully functional
- Can be moved to suites via edit

### Backward Compatible
- Old test case data intact
- `suite_id` = NULL for uncategorized
- No data loss

### Performance
- Optimized for up to 500 test cases
- Lazy loading considered for larger sets
- Instant search & filter

## Button Reference

### Suite Actions (on hover)
```
[+]  Add test case to this suite
[📁] Add sub-suite
[✏️]  Edit suite name/description  
[🗑️]  Delete suite (moves cases to Uncategorized)
```

### Test Case Actions (on hover)
```
[✏️]  Edit test case
[🗑️]  Delete test case
```

### Top Bar Actions
```
[📁+ New Suite]     Create root-level suite
[+ New Test Case]   Create test case (choose suite in form)
```

## Tips

1. **Organization Strategy:**
   ```
   ├─ Smoke Tests
   ├─ Regression
   │  ├─ Payment
   │  ├─ User Auth
   │  └─ API Tests
   └─ Exploratory
   ```

2. **Naming Conventions:**
   - Suites: Feature/module names ("Payment Integration")
   - Sub-suites: Specific areas ("Credit Card", "E-Wallet")
   - Test cases: Action-based ("[Positive] Login with valid credentials")

3. **Efficient Workflow:**
   - Create suite structure first
   - Batch create test cases
   - Use search to find & organize existing cases

## Troubleshooting

**Q: I don't see the tree?**
- Check migration ran successfully
- Refresh page
- Check console for errors

**Q: Actions buttons not showing?**
- Hover over items
- They appear on hover (opacity-0 → opacity-100)

**Q: Can't delete suite?**
- Suite must be empty or
- Confirmation will move cases to Uncategorized

**Q: Test cases disappeared?**
- Check "Uncategorized" section at bottom
- Use search to find

## What's Next

### Phase 2 (Future)
- ✅ Drag & drop test cases
- ✅ Drag & drop suites for reordering
- ✅ Bulk operations (select multiple)
- ✅ Copy/move multiple cases
- ✅ Clone suite with all cases
- ✅ Import/export with suite structure

## File Changes

**New Files:**
- `src/components/TestCaseTree.tsx` - Tree component
- `src/pages/TestCasesPageWithTree.tsx` - New page
- `migration-add-suites.sql` - Database migration

**Modified Files:**
- `src/App.tsx` - Route updated
- `src/types/database.ts` - Added test_suites type

**Backup:**
- `src/pages/TestCasesPage.old.tsx` - Old page (backup)

---

**Status:** ✅ Ready for Testing
**Breaking Changes:** None
**Data Migration:** Not required
