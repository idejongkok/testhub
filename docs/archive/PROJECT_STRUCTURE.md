# Project Structure

## 📁 Directory Overview

```
qa-test-management/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── Layout.tsx      # Main layout with sidebar
│   │   └── ProtectedRoute.tsx
│   │
│   ├── pages/              # Page components
│   │   ├── LoginPage.tsx   # Authentication
│   │   ├── DashboardPage.tsx  # Project management
│   │   ├── TestCasesPage.tsx  # Test case CRUD
│   │   ├── TestPlansPage.tsx  # Test plan management
│   │   └── TestRunsPage.tsx   # Test execution & results
│   │
│   ├── store/              # State management (Zustand)
│   │   ├── authStore.ts    # Authentication state
│   │   └── projectStore.ts # Project state
│   │
│   ├── types/              # TypeScript definitions
│   │   └── database.ts     # Supabase database types
│   │
│   ├── lib/                # Utilities
│   │   ├── supabase.ts     # Supabase client
│   │   └── utils.ts        # Helper functions
│   │
│   ├── App.tsx             # Main app with routing
│   ├── main.tsx            # Entry point
│   ├── index.css           # Global styles
│   └── vite-env.d.ts       # Vite types
│
├── public/                 # Static assets
├── database-schema.sql     # Complete database schema
├── README.md              # Main documentation
├── DEPLOYMENT.md          # Deployment guide
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config
├── tailwind.config.js     # Tailwind CSS config
└── .env.example           # Environment variables template
```

## 🎯 Key Files Explained

### Configuration Files

**package.json**
- All project dependencies
- Build scripts: `dev`, `build`, `preview`
- React 18, TypeScript, Vite, Supabase

**tsconfig.json**
- TypeScript compiler options
- Path aliases: `@/*` → `./src/*`
- Strict mode enabled

**vite.config.ts**
- Vite build configuration
- Path resolver
- React plugin

**tailwind.config.js**
- Tailwind CSS customization
- Custom color palette (primary blues)
- Content paths for purging

### Core Application Files

**src/main.tsx**
- React root rendering
- Imports global CSS
- Strict mode enabled

**src/App.tsx**
- React Router setup
- Protected routes configuration
- Authentication flow
- State initialization

**src/lib/supabase.ts**
- Supabase client singleton
- Environment variables
- Auth configuration

### State Management

**src/store/authStore.ts**
```typescript
- user: User | null
- loading: boolean
- signIn()
- signUp()
- signOut()
- initialize()
```

**src/store/projectStore.ts**
```typescript
- projects: Project[]
- currentProject: Project | null
- fetchProjects()
- createProject()
- updateProject()
- deleteProject()
- setCurrentProject()
```

### Component Architecture

**Layout Component**
- Sidebar navigation
- User profile display
- Project selector
- Responsive design

**Page Components**
Each page follows this pattern:
1. State management with hooks
2. Data fetching (useEffect)
3. CRUD operations
4. Modal forms
5. List/grid display

### Database Types

**src/types/database.ts**
- Generated from Supabase schema
- Type-safe database operations
- Enums: TestType, Priority, Status, etc.
- Row, Insert, Update types for each table

## 🔄 Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Store Action (Zustand)
    ↓
Supabase API Call
    ↓
Database Operation (PostgreSQL)
    ↓
RLS Policy Check
    ↓
Response
    ↓
Store Update
    ↓
Component Re-render
```

## 🎨 UI Component Hierarchy

```
App
└── BrowserRouter
    ├── LoginPage (unprotected)
    └── ProtectedRoute
        └── Layout
            ├── Sidebar
            │   ├── Logo
            │   ├── Project Selector
            │   ├── Navigation Links
            │   └── User Menu
            └── Main Content
                ├── DashboardPage
                ├── TestCasesPage
                ├── TestPlansPage
                └── TestRunsPage
```

## 📦 Dependencies

### Production
- **react** (18.2.0) - UI library
- **react-router-dom** (6.21.3) - Routing
- **@supabase/supabase-js** (2.39.3) - Backend
- **zustand** (4.5.0) - State management
- **react-hook-form** (7.49.3) - Form handling
- **lucide-react** (0.312.0) - Icons
- **date-fns** (3.2.0) - Date formatting
- **tailwind-merge** (2.2.1) - Tailwind utilities
- **clsx** (2.1.0) - Class name helper

### Development
- **vite** (5.0.11) - Build tool
- **typescript** (5.3.3) - Type checking
- **tailwindcss** (3.4.1) - CSS framework
- **@vitejs/plugin-react** (4.2.1) - React plugin
- **eslint** - Code linting

## 🗄️ Database Schema

### Tables (7)
1. **projects** - Project metadata
2. **test_cases** - Test case repository
3. **test_plans** - Test planning
4. **test_plan_cases** - Many-to-many junction
5. **test_runs** - Test execution runs
6. **test_run_results** - Test results with attachments

### Storage (1)
- **test-attachments** - File uploads bucket

### Enums (5)
- test_type, priority, status, run_status, result_status

### Policies (18)
- RLS enabled on all tables
- User-scoped data access
- Storage bucket policies

## 🔧 Development Workflow

### 1. Setup
```bash
npm install
cp .env.example .env
# Edit .env with Supabase credentials
```

### 2. Development
```bash
npm run dev
# App runs on http://localhost:5173
```

### 3. Build
```bash
npm run build
# Output in ./dist
```

### 4. Deploy
```bash
# Via GitHub → Cloudflare Pages
git push origin main

# Or via Wrangler CLI
wrangler pages deploy dist
```

## 📝 Adding New Features

### Example: Add New Test Type

**1. Update Database Enum**
```sql
ALTER TYPE test_type ADD VALUE 'performance';
```

**2. Update TypeScript Types**
```typescript
// src/types/database.ts
export type TestType = 'functional_web' | 'functional_mobile' | 'api' | 'performance'
```

**3. Update UI**
```tsx
// src/pages/TestCasesPage.tsx
<option value="performance">Performance Testing</option>
```

### Example: Add New Field to Test Case

**1. Add Database Column**
```sql
ALTER TABLE test_cases ADD COLUMN severity VARCHAR(20);
```

**2. Update Type Definition**
```typescript
severity?: string | null
```

**3. Add to Form**
```tsx
<Input label="Severity" ... />
```

## 🚀 Performance Optimizations

### Already Implemented
- ✅ Code splitting (React lazy loading ready)
- ✅ Tree shaking (Vite)
- ✅ Minification (production build)
- ✅ Asset optimization
- ✅ Database indexes
- ✅ RLS policies for security

### Future Improvements
- [ ] Implement React.lazy() for pages
- [ ] Add service worker for offline support
- [ ] Implement virtual scrolling for large lists
- [ ] Add pagination for test cases
- [ ] Image compression before upload

## 🔐 Security Considerations

### Implemented
- ✅ RLS on all tables
- ✅ User-scoped data
- ✅ HTTPS only (Cloudflare)
- ✅ Environment variables
- ✅ Client-side auth state
- ✅ Storage bucket policies

### Recommendations
- Use strong passwords
- Enable 2FA on Supabase
- Regularly audit user access
- Monitor Supabase logs
- Keep dependencies updated

## 📊 File Statistics

- **Total TypeScript Files:** 21
- **Total Components:** 8
- **Total Pages:** 5
- **Total Lines of Code:** ~3,500+
- **Database Tables:** 7
- **API Endpoints:** Auto-generated by Supabase

## 🎓 Learning Resources

- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org
- **Vite:** https://vitejs.dev
- **Supabase:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com
- **Zustand:** https://github.com/pmndrs/zustand

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Author:** BFI QA Team
