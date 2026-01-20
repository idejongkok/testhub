# Feature: Bug/Issue Tracking

## Overview
Fitur ini menambahkan kemampuan untuk melacak bugs dan issues yang ditemukan selama testing, baik yang terkait dengan test case maupun yang ditemukan secara ad-hoc.

## Features

### 1. **Bug Management Page**
- List semua bugs dalam project
- CRUD operations (Create, Read, Update, Delete)
- Filter by status (Open, In Progress, Resolved, Closed, Won't Fix)
- Filter by severity (Critical, High, Medium, Low)
- Display reporter dan assignee information
- Link ke related test run dan test case
- External link support (Jira, GitHub, etc.)
- Tags support untuk categorization

### 2. **Quick Report Bug Action**
- Button "Report Bug" di TestRunDetail untuk setiap test case
- Auto-navigates ke BugsPage dengan pre-filled data:
  - Test Run ID
  - Test Case ID
  - Test Run Result ID
  - Bug title (auto-generated dari test case title)
  - Environment (dari test run environment)
  - Severity (default: medium)

### 3. **Comprehensive Bug Details**
Setiap bug dapat menyimpan:
- **Basic Info**: Title, Description, Status, Severity
- **Reproduction**: Steps to reproduce, Expected behavior, Actual behavior
- **Environment**: Environment, Browser, Device, OS
- **Links**: Test Run, Test Case, Test Run Result, External Link
- **People**: Reporter (auto-set), Assignee, Resolver
- **Metadata**: Tags, Created At, Updated At, Resolved At

## Database Schema

### Enums
```sql
CREATE TYPE bug_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'wont_fix');
CREATE TYPE bug_severity AS ENUM ('critical', 'high', 'medium', 'low');
```

### Bugs Table
```sql
CREATE TABLE bugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    test_run_id UUID REFERENCES test_runs(id) ON DELETE SET NULL,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
    test_run_result_id UUID REFERENCES test_run_results(id) ON DELETE SET NULL,

    -- Bug details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity bug_severity DEFAULT 'medium',
    status bug_status DEFAULT 'open',

    -- Reproduction
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,

    -- Environment
    environment VARCHAR(100),
    browser VARCHAR(100),
    device VARCHAR(100),
    os VARCHAR(100),

    -- Attachments and links
    attachments JSONB,
    external_link VARCHAR(500),

    -- Assignment and tracking
    assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## UI Components

### BugsPage.tsx
Location: `src/pages/BugsPage.tsx`

**Features:**
- Full bug list with status and severity badges
- Filter dropdowns for status and severity
- Create/Edit modal with comprehensive form
- Display reporter and assignee info
- Link to related test run/case (if available)
- External link button (if provided)
- Tags display
- Delete confirmation

### TestRunDetail.tsx - Bug Report Action
Location: `src/components/TestRunDetail.tsx`

**New Features:**
- Added "Report Bug" button (orange bug icon) in quick actions
- Button appears for each test case result
- Clicking navigates to BugsPage with pre-filled data via navigation state

## Navigation

### Layout.tsx
- Added "Bugs" navigation item with Bug icon
- Appears in sidebar navigation
- Routes to `/projects/:projectId/bugs` or `/bugs`

### App.tsx
- Added `/projects/:projectId/bugs` route
- Added legacy `/bugs` route for backward compatibility
- Both routes use ProtectedRoute and ProjectRoute wrappers

## Usage Flow

### 1. Report Bug from Test Run
1. User opens "Manage" pada test run
2. TestRunDetail modal terbuka dengan list test cases
3. User clicks Bug icon (orange) pada test case yang bermasalah
4. Navigates ke BugsPage dengan form sudah pre-filled:
   - Title: "Issue in: [Test Case Title]"
   - Severity: Medium
   - Environment: [From Test Run]
   - Linked to: Test Run, Test Case, Test Run Result
5. User melengkapi detail bug (steps, expected, actual, etc.)
6. Click "Create" untuk save bug

### 2. Create Standalone Bug
1. User navigates ke Bugs page dari sidebar
2. Clicks "New Bug" button
3. Fills in bug details manually
4. Optionally link to test run/case (jika relevan)
5. Click "Create" untuk save bug

### 3. Manage Bugs
1. View all bugs di BugsPage
2. Filter by status atau severity
3. Click "Edit" untuk update bug details
4. Update status (Open → In Progress → Resolved → Closed)
5. Assign bug ke team member
6. Add external link (Jira, GitHub issue, etc.)
7. Delete bug jika tidak relevan

## Workflow Integration

### During Testing
1. **Find Issue**: Tester menemukan bug saat execute test run
2. **Quick Report**: Click bug icon di test case result
3. **Add Details**: Lengkapi reproduction steps dan environment info
4. **Link Evidence**: Add external link ke screenshot/video jika ada
5. **Assign**: Assign ke developer untuk fixing

### After Testing
1. **Review Bugs**: Check all bugs di BugsPage
2. **Prioritize**: Filter by severity untuk handle critical/high first
3. **Track Progress**: Update status as bugs being fixed
4. **Verify Fix**: Resolve bug setelah verified fixed
5. **Close**: Close bug setelah deployed/verified in production

## Benefits

1. **Centralized Tracking** - Semua bugs dalam satu tempat
2. **Context Preservation** - Link to test run/case preserves testing context
3. **Quick Reporting** - One-click bug reporting dari test execution
4. **Flexible** - Support both test-related dan ad-hoc bugs
5. **Team Collaboration** - Assignment dan tracking resolution
6. **External Integration** - Link to external issue trackers (Jira, GitHub)
7. **Better Visibility** - Filter dan search untuk quick access
8. **Audit Trail** - Track reporter, assignee, resolved by, timestamps

## Future Enhancements

Possible improvements:
- Attachment upload support (screenshots, logs)
- Comments/discussion thread per bug
- Bug severity auto-detection based on test priority
- Email notifications on assignment/status change
- Bug metrics and analytics (open rate, resolution time, etc.)
- Export bugs to external issue trackers
- Bulk operations (assign multiple, change status, etc.)
- Custom fields per project
- Bug templates for common issue types
- Integration with CI/CD to auto-create bugs from failed tests

## Migration

To apply this feature to your database:
```bash
# Run the migration
psql -h <host> -U <user> -d <database> -f migrations/add-bugs-table.sql
```

Or if using Supabase:
1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `migrations/add-bugs-table.sql`
3. Run the SQL script
4. Verify table and policies created successfully
