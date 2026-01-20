# Quick Start Guide

## 🚀 Getting Started with QA Test Management

### Step 1: Create Your First Project
1. Click **"New Project"** on dashboard
2. Enter project name (e.g., "Mobile App Testing")
3. Enter project code (e.g., "MAT") - used for identification
4. Add description (optional)
5. Click **"Create Project"**

### Step 2: Add Test Cases

#### Creating a Test Case
1. Go to **"Test Cases"** from sidebar
2. Click **"New Test Case"**
3. Fill in the details based on test type:

**For Web Functional Testing:**
- Title: Clear description (e.g., "Login with valid credentials")
- Test Type: Select "Web Functional"
- Priority: Low/Medium/High/Critical
- Status: **Ready** (default) - ready for test execution
- Preconditions: What needs to be set up first
- Test Steps: Add multiple steps with expected results
- Tags: Categorize (e.g., "login, authentication, smoke")

**For Mobile Functional Testing:**
- Same as Web, plus:
- Platform: iOS / Android / Both
- Device: Specify device/OS version

**For API Testing:**
- Title: API endpoint description
- Test Type: Select "API Testing"
- HTTP Method: GET, POST, PUT, PATCH, DELETE
- Endpoint: API URL (e.g., "/api/v1/login")
- Headers: JSON format `{"Content-Type": "application/json"}`
- Request Body: JSON payload
- Expected Status: 200, 201, 400, etc.
- Expected Response: JSON response structure

### Step 3: Organize with Test Plans

#### Creating a Test Plan
1. Go to **"Test Plans"** from sidebar
2. Click **"New Test Plan"**
3. Enter plan name (e.g., "Sprint 1 - Regression")
4. Set start/end dates (optional)
5. Click **"Create Test Plan"**

#### Add Test Cases to Plan
1. Click **"Manage Cases"** on the test plan card
2. Check the test cases you want to include
3. You'll see badges showing:
   - Test Type (Web/Mobile/API)
   - Status (Draft/Ready/Deprecated)
4. Click **"Save"**

### Step 4: Execute Test Runs

#### Creating a Test Run
1. Go to **"Test Runs"** from sidebar
2. Click **"New Test Run"**
3. Enter run name (e.g., "Staging - Smoke Test")
4. Select environment:
   - Development
   - Staging
   - Production
5. Click **"Create Test Run"**
   - This automatically includes ALL test cases from your project

#### Executing Tests
1. Click **"Execute"** on the test run card
2. For each test case:
   - Update status: **Passed / Failed / Blocked / Skipped / In Progress**
   - Enter actual result
   - Add comments
   - **Upload screenshots/evidence** or **paste Google Drive links**
   - Track execution time (optional)
3. Click **"Save Result"** for each test case
4. When done, click **"Complete Run"**

### Test Case Status Workflow

```
Draft → Ready → [Execution] → Deprecated (if outdated)
```

**Status Meanings:**
- **Draft**: Still being written, not ready for execution
- **Ready**: Approved and ready for test execution ✅ (Default for new test cases)
- **Deprecated**: No longer relevant, archived

**Best Practice:**
- New test cases default to "Ready" status
- Change to "Draft" if still working on it
- Mark as "Deprecated" when no longer needed

### Attachment Best Practices

#### When to Upload Files:
- Screenshots of bugs/issues
- Small PDFs (test data, requirements)
- Evidence that needs to be stored permanently

#### When to Use Links:
- Large files (videos, extensive logs)
- Google Drive shared documents
- Existing documentation URLs
- Collaborative evidence (multiple team members)

**Example Google Drive Link Format:**
```
https://drive.google.com/file/d/1abc123xyz/view?usp=sharing
```

### Tips & Tricks

#### Efficient Test Case Creation
1. **Use Tags** - Makes filtering easier later
   - Examples: "smoke", "regression", "critical-path"
2. **Be Specific in Steps** - Clear actions and expected results
3. **Set Realistic Priorities** - Not everything is "Critical"

#### Test Plan Organization
1. **Group by Sprint** - "Sprint 1 Regression"
2. **Group by Feature** - "Payment Module Testing"
3. **Group by Test Type** - "API Smoke Tests"

#### Test Run Execution
1. **Use Environments Properly**:
   - Dev: Developer testing, frequent changes
   - Staging: Pre-production, stable features
   - Production: Live monitoring, smoke tests only
2. **Add Comments Liberally** - Future you will thank you
3. **Upload Evidence** - Especially for failed tests

### Common Workflows

#### Scenario 1: New Feature Testing
1. Create test cases with Status = "Ready"
2. Create test plan for the feature
3. Add test cases to plan
4. Create test run in "Staging" environment
5. Execute and upload evidence
6. Review results, create bug reports

#### Scenario 2: Regression Testing
1. Filter test cases by tag: "regression"
2. Create test plan: "Sprint X Regression"
3. Add all regression test cases
4. Run in "Staging" before production
5. All must pass before deploy

#### Scenario 3: API Integration Testing
1. Create API test cases with full request/response
2. Tag as "api" and "integration"
3. Create dedicated API test plan
4. Run before and after API changes
5. Document actual vs expected responses

### Keyboard Shortcuts (Browser)
- `Ctrl/Cmd + S` - Save (in forms)
- `Esc` - Close modal
- `Tab` - Navigate between fields

### Troubleshooting

**Q: I can't see my test cases in Test Plan?**
A: Make sure test cases exist in your current project. Status doesn't matter - all test cases are shown.

**Q: Test Run shows 0 test cases?**
A: Make sure you have test cases in the project. Create at least one test case first.

**Q: Can't upload file?**
A: Check file size (max 50MB on free tier). Try using a Google Drive link instead.

**Q: Lost my work?**
A: All data auto-saves to Supabase. Check your internet connection.

### Next Steps

1. ✅ Create your first project
2. ✅ Add 3-5 test cases
3. ✅ Create a test plan
4. ✅ Execute a test run
5. ✅ Upload evidence/screenshots
6. Share with your team!

### Need Help?

- Check **README.md** for detailed setup
- Check **DEPLOYMENT.md** for deployment help
- Check **PROJECT_STRUCTURE.md** for technical details

---

**Happy Testing! 🧪**
