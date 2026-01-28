# Upgrade Guide - Tree Structure UI

## 🎯 Overview

Aplikasi sekarang support **Tree Structure** untuk test cases seperti Qase.io dengan Feature:
- ✅ **Suites/Folders** - Organize test cases dalam folders
- ✅ **Nested Folders** - Support unlimited depth
- ✅ **Drag & Drop** - Move test cases antar suites
- ✅ **Accordion View** - Expand/collapse folders
- ✅ **Modern UI** - Clean interface seperti Qase.io

## 📦 Step 1: Run Database Migration

Jalankan SQL ini di Supabase SQL Editor:

```bash
# File: migration-add-suites.sql
```

Migration ini akan:
1. Create table `test_suites` untuk folders
2. Add column `suite_id` ke `test_cases`
3. Add column `position` untuk ordering
4. Setup RLS policies
5. Create triggers

## 📦 Step 2: Install Dependencies

```bash
npm install
```

New dependencies yang ditambahkan:
- `@dnd-kit/core` - Drag and drop core
- `@dnd-kit/sortable` - Sortable support
- `@dnd-kit/utilities` - Utilities

## 🚀 Step 3: Features

### Create Suite/Folder

1. Go to Test Cases page
2. Click "+ New Suite" di sidebar
3. Enter suite name
4. Optional: Select parent suite untuk nested folder
5. Click "Create"

### Create Test Case in Suite

1. Select suite dari tree
2. Click "+ New Test Case"
3. Test case otomatis masuk ke suite yang dipilih
4. Atau buat tanpa suite (masuk ke "Uncategorized")

### Move Test Case (Drag & Drop)

1. Hover test case yang mau dipindah
2. Drag icon `⋮⋮` akan muncul
3. Drag test case
4. Drop ke suite lain
5. Otomatis update `suite_id`

### Organize Folders

**Expand/Collapse:**
- Click `▶` arrow untuk toggle expand/collapse
- State tersimpan per session

**Nested Folders:**
- Create sub-folder dengan pilih parent
- Unlimited nesting depth
- Visual indentation otomatis

### Search & Filter

**Search:**
- Type di search box
- Search across all suites
- Results tetap show dalam tree structure

**Filter by Type:**
- Web / Mobile / API filter
- Kombinasi dengan search

## 🎨 UI Changes

### Before (List View)
```
┌────────────────────────┐
│ Test Case 1            │
│ Test Case 2            │
│ Test Case 3            │
└────────────────────────┘
```

### After (Tree View)
```
┌────────────────────────┐
│ ▼ Payment Suite (5)    │
│   │─ TC1: Credit Card  │
│   │─ TC2: Debit Card   │
│   ▶ Sub: 3D Secure (2) │
│ ▼ Login Suite (3)      │
│   │─ TC3: Valid Login  │
└────────────────────────┘
```

## 🔧 Technical Details

### New Database Structure

**test_suites table:**
```sql
id: uuid
project_id: uuid
parent_id: uuid (nullable)
name: varchar
description: text
position: integer
```

**test_cases updates:**
```sql
+ suite_id: uuid (nullable)
+ position: integer
```

### Component Architecture

```
TestCasesPage
├── Sidebar (Tree)
│   └── TestCaseTree
│       ├── SuiteNode (recursive)
│       └── CaseNode (draggable)
└── Detail Panel
    ├── Case Details
    └── Edit Form
```

### State Management

**Tree State:**
- Suites data from `test_suites` table
- Test cases grouped by `suite_id`
- Expand/collapse state in component
- Drag & drop handled by @dnd-kit

**Data Flow:**
```
fetch suites → build tree → render
     ↓            ↓           ↓
fetch cases → group by → attach to nodes
                suite_id
```

## 🐛 Migration Notes

### Existing Test Cases

Test cases yang sudah ada akan:
- ✅ Muncul di "Uncategorized" section
- ✅ Bisa di-drag ke suite baru
- ✅ `suite_id` = NULL initially

### Creating First Suite

Recommended workflow:
1. Create suite "Smoke Tests"
2. Create suite "Regression Tests"
3. Drag existing test cases ke suites yang sesuai
4. Create sub-suites kalau perlu

## 📊 Best Practices

### Folder Structure

**Good:**
```
├─ Smoke Tests
│  ├─ Critical Path
│  └─ Basic Functionality
├─ Regression
│  ├─ Payment
│  │  ├─ Credit Card
│  │  └─ E-Wallet
│  └─ User Management
└─ API Tests
```

**Avoid:**
```
├─ Tests
│  └─ All Tests
│     └─ More Tests
│        └─ (too deep, hard to navigate)
```

### Naming Convention

**Suites:**
- Use domain/feature names
- Clear and descriptive
- Example: "Payment Integration", "User Auth"

**Test Cases:**
- Keep titles concise in tree
- Full detail in description
- Example: "[Positive] Login with valid credentials"

## 🎯 Keyboard Shortcuts

- `Arrow Up/Down` - Navigate tree
- `Arrow Right` - Expand suite
- `Arrow Left` - Collapse suite
- `Enter` - Open selected item
- `Delete` - Delete selected (with confirm)

## 🔄 Backward Compatibility

**API:**
- All existing API calls still work
- `suite_id` optional in create/update
- Queries auto-filter by project

**Data:**
- Existing test cases NOT affected
- Safe to rollback if needed
- No data loss

## 🚧 Known Limitations

1. **Performance**: Large trees (>1000 items) may be slow
   - Solution: Implement virtualization later

2. **Concurrent Updates**: No real-time sync
   - Solution: Refresh on focus/interval

3. **Mobile**: Drag & drop limited on mobile
   - Solution: Use context menu instead

## 📱 Mobile Considerations

On mobile devices:
- Tree navigation works normal
- Drag & drop disabled
- Use long-press menu untuk move
- Responsive breakpoints applied

## 🎓 Learning Resources

**DND Kit:**
- https://docs.dndkit.com

**Tree Patterns:**
- https://www.w3.org/WAI/ARIA/apg/patterns/treeview/

## 💡 Pro Tips

1. **Bulk Operations**: Select multiple + context menu (future)
2. **Clone Suite**: Duplicate suite structure
3. **Import/Export**: CSV with suite path
4. **Templates**: Save suite structure as template

## 🐞 Troubleshooting

**Tree not showing:**
- Check console for errors
- Verify migration ran successfully
- Check `test_suites` table has data

**Drag & drop not working:**
- Ensure @dnd-kit installed
- Check browser compatibility
- Try refresh page

**Test cases disappeared:**
- Check "Uncategorized" section
- Filter might be active
- `suite_id` might be orphaned

## ✅ Checklist

- [ ] Run migration SQL
- [ ] npm install
- [ ] Create first suite
- [ ] Organize existing test cases
- [ ] Test drag & drop
- [ ] Create nested folders
- [ ] Test search & filter

---

**Migration Status:** Ready for Production
**Breaking Changes:** None
**Data Migration:** Not required (backward compatible)
