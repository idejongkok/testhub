# Manual Update Instructions

## Files to Update

### 1. src/pages/TestRunsPage.tsx

Add these imports at top:
```typescript
import TestRunExecutor from '@/components/TestRunExecutor'
import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2, FileText } from 'lucide-react'
```

Replace the execute modal section (around line 400-600) with:
```typescript
{/* Execute Modal - Use New Executor */}
{showExecuteModal && selectedRun && currentProject && (
  <TestRunExecutor
    testRunId={selectedRun.id}
    testCases={testCases}
    existingResults={runResults}
    onClose={() => {
      setShowExecuteModal(false)
      setSelectedRun(null)
    }}
    onComplete={() => {
      setShowExecuteModal(false)
      setSelectedRun(null)
      fetchTestRuns()
    }}
  />
)}
```

Add these new functions before return statement:
```typescript
const navigate = useNavigate()

const handleEdit = (run: TestRun) => {
  setEditingRun(run)
  setFormData({
    name: run.name,
    description: run.description || '',
    environment: run.environment || 'staging',
  })
  setShowModal(true)
}

const handleDelete = async (id: string) => {
  if (confirm('Delete this test run? All results will be lost.')) {
    await supabase.from('test_runs').delete().eq('id', id)
    fetchTestRuns()
  }
}

const handleViewReport = (runId: string) => {
  navigate(`/test-runs/${runId}/report`)
}
```

In the test runs list (around line 250), add action buttons:
```typescript
<div className="flex gap-2">
  <Button
    size="sm"
    variant="secondary"
    onClick={() => handleViewReport(run.id)}
  >
    <FileText className="w-4 h-4 mr-1" />
    Report
  </Button>
  <Button
    size="sm"
    variant="secondary"
    onClick={() => handleExecute(run)}
  >
    <PlayCircle className="w-4 h-4 mr-1" />
    Execute
  </Button>
  <Button
    size="sm"
    variant="secondary"
    onClick={() => handleEdit(run)}
  >
    <Edit2 className="w-4 h-4" />
  </Button>
  <Button
    size="sm"
    variant="secondary"
    onClick={() => handleDelete(run.id)}
  >
    <Trash2 className="w-4 h-4" />
  </Button>
</div>
```

### 2. src/App.tsx

Add imports:
```typescript
import TestRunReport from './pages/TestRunReport'
import TestRunReportPublic from './pages/TestRunReportPublic'
```

Add routes inside `<Routes>`:
```typescript
<Route path="/test-runs/:id/report" element={<TestRunReport />} />
<Route path="/public/test-run/:id" element={<TestRunReportPublic />} />
```


1. Go to Test Runs
2. Click "Execute" on any test run
3. Should see new executor with steps
4. Fill in result, click "Save & Next"
5. After completion, click "Report"
6. Click "Share" to get public link
7. Open public link in incognito → Should see report

## Troubleshooting

**Executor not showing steps:**
- Check test case has `steps` array in database
- Each step needs: `step_number`, `action`, `expected_result`

**Can't upload files:**
- Create `test-attachments` bucket in Supabase
- Set bucket to public
- Check RLS policies allow uploads

**Report page blank:**
- Check route added to App.tsx
- Verify test run ID is valid
- Check browser console for errors

**Public link 404:**
- Ensure `/public/test-run/:id` route exists
- Route should NOT require authentication
