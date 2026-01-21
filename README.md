# TestHub - Quality Assurance Platform

A comprehensive test management platform for QA testing. Supports functional testing (web & mobile), API testing, and includes powerful features for test case management, test planning, and execution tracking.

## 🚀 Features

### ✅ Project Management
- Create & manage multiple QA projects
- Project-based organization
- Switch between projects

### ✅ Test Case Repository
- **Web Functional Testing**
  - Step-by-step test procedures
  - Preconditions & expected results
  - Priority & status management
  
- **Mobile Functional Testing**
  - Platform-specific (iOS/Android/Both)
  - Device specifications
  - Mobile-specific test scenarios

- **API Testing**
  - HTTP method support (GET, POST, PUT, PATCH, DELETE)
  - Request headers & body (JSON)
  - Expected status codes
  - Response validation
  - Full API documentation in test cases

### ✅ Test Plans
- Group test cases into test plans
- Date-based planning
- Select specific test cases for each plan

### ✅ Test Runs
- Execute test cases with real-time status tracking
- Environment-based runs (dev, staging, production)
- **Attachment Support:**
  - ✅ Upload screenshots/files directly to Supabase Storage
  - ✅ Link external files (Google Drive, etc.)
  - Manage multiple attachments per test result
- Result tracking: Passed, Failed, Blocked, Skipped
- Execution time tracking
- Comments & actual results

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS
- **State Management:** Zustand
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (for attachments)
- **Routing:** React Router v6
- **Deployment:** Cloudflare Pages

## 📦 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd qa-test-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Supabase

#### A. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy your `Project URL` and `anon public key`

#### B. Run Database Migration
Copy and run the SQL from `database-schema.sql` in your Supabase SQL Editor:

**Key tables created:**
- `projects` - Project management
- `test_cases` - Test case repository (supports web/mobile/api)
- `test_plans` - Test planning
- `test_plan_cases` - Many-to-many relationship
- `test_runs` - Test execution runs
- `test_run_results` - Individual test results with attachments

#### C. Setup Storage Bucket
The SQL already creates the `test-attachments` bucket with proper policies.

### 4. Environment Variables
Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run Development Server
```bash
npm run dev
```

App will run at `http://localhost:5173`

## 🚀 Deployment to Cloudflare Pages

### Method 1: GitHub Integration (Recommended)

1. Push code to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
3. Pages → Create a project → Connect to Git
4. Select your repository
5. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy!

### Method 2: Direct Upload (Wrangler)

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build project
npm run build

# Deploy
wrangler pages deploy dist
```

## 📝 Usage Guide

### 1. **Create Project**
- Click "New Project"
- Enter project name, code (e.g., "MQA"), and description
- Project code will be used for test case identification

### 2. **Add Test Cases**

#### For Web Functional Testing:
1. Select "Web Functional" as test type
2. Add preconditions
3. Add test steps with expected results
4. Set priority (Low/Medium/High/Critical)
5. Add tags for categorization

#### For API Testing:
1. Select "API Testing" as test type
2. Choose HTTP method (GET, POST, etc.)
3. Enter endpoint URL
4. Add headers (JSON format)
5. Add request body (for POST/PUT)
6. Set expected status code
7. Define expected response (JSON)

#### For Mobile Testing:
1. Select "Mobile Functional" as test type
2. Choose platform (iOS/Android/Both)
3. Specify device/OS version
4. Add test steps similar to web

### 3. **Create Test Plan**
- Group related test cases
- Set start/end dates
- Select which test cases to include

### 4. **Execute Test Run**
- Create new test run
- Select environment (dev/staging/production)
- For each test case:
  - Update result status (Passed/Failed/etc.)
  - Add actual results
  - Add comments
  - **Upload screenshot/evidence** or **add Google Drive link**
  - Track execution time
- Mark run as complete when done

### 5. **Attachment Management**
Two ways to add evidence:

**Upload File:**
- Click "Upload File" button
- Select image/PDF from your computer
- File is automatically uploaded to Supabase Storage
- Accessible directly from the app

**Add Link:**
- Paste Google Drive link or any external URL
- Useful for large files or shared documents
- Click external link icon to open in new tab

## 🔒 Security Features

- **Row Level Security (RLS):** Users can only see their own projects
- **Authentication:** Supabase Auth with email/password
- **Storage Policies:** Users can only upload to their own folders
- **Public bucket:** Attachments are publicly accessible (suitable for screenshots)

## 📊 Database Schema Highlights

```
projects (1) ─── (N) test_cases
                  │
                  └─── (N) test_plan_cases (M) ─── (N) test_plans
                  │
                  └─── (N) test_run_results (M) ─── (N) test_runs
```

## 🎨 UI Components

Built with reusable components:
- `Button` - Multiple variants (primary, secondary, danger, ghost)
- `Input` - Form inputs with labels and error states
- `Card` - Container component for content sections
- `Layout` - Sidebar navigation with user management

## 🔧 Development Tips

### Adding New Test Types
Edit `src/types/database.ts`:
```typescript
export type TestType = 'functional_web' | 'functional_mobile' | 'api' | 'your_new_type'
```

### Customizing Priorities
Edit priority enum in database and TypeScript types.

### Extending Attachment Types
Currently supports: images, PDFs, and external links. To add more:
1. Update file input accept attribute
2. Add validation in upload handler

## 📱 Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - feel free to use for personal and commercial projects.

## 🐛 Troubleshooting

### "Failed to upload file"
- Check Supabase storage bucket exists
- Verify storage policies are set correctly
- Check file size (Supabase free tier: 50MB limit per file)

### "Cannot read test cases"
- Verify you've run the database migration
- Check RLS policies are enabled
- Ensure you're logged in with correct account

### Build fails on Cloudflare
- Double-check environment variables are set
- Ensure build command is `npm run build`
- Verify Node version compatibility (use Node 18+)

## 📚 Documentation

Comprehensive documentation available in `/docs/` folder:
- **Guides:** Setup, deployment, and usage guides
- **Features:** Detailed feature documentation
- **Migrations:** Database migration docs in `/migrations/`

## 📞 Support

For issues or questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Include console errors if applicable

---

**TestHub by Uno - Ide Jongkok**
