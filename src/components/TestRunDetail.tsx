import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  X,
  Plus,
  Trash2,
  PlayCircle,
  Bug,
  FileText,
  GripVertical,
  Link2,
  Check,
  Link as LinkIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database, ResultStatus } from '@/types/database'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type TestCase = Database['public']['Tables']['test_cases']['Row']
type TestRunResult = Database['public']['Tables']['test_run_results']['Row']
type TestRun = Database['public']['Tables']['test_runs']['Row']

interface TestRunDetailProps {
  testRun: TestRun
  onClose: () => void
  onUpdate: () => void
  onCopyLink?: () => void
  linkCopied?: boolean
}

interface EnrichedResult extends TestRunResult {
  test_case?: TestCase
}

interface Attachment {
  type: 'upload' | 'link'
  url: string
  name: string
}

interface ExecutionState {
  result_status: ResultStatus
  actual_result: string
  comments: string
  attachments: Attachment[]
  execution_time: number
}

export default function TestRunDetail({ testRun, onClose, onUpdate, onCopyLink, linkCopied }: TestRunDetailProps) {
  const { user } = useAuthStore()
  const { currentProject } = useProjectStore()
  const navigate = useNavigate()
  const [results, setResults] = useState<EnrichedResult[]>([])
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ResultStatus | 'all'>('all')
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)
  const [selectedResult, setSelectedResult] = useState<EnrichedResult | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [executionData, setExecutionData] = useState<ExecutionState>({
    result_status: 'untested',
    actual_result: '',
    comments: '',
    attachments: [],
    execution_time: 0
  })
  const [savingExecution, setSavingExecution] = useState(false)

  useEffect(() => {
    fetchResults()
    fetchAllTestCases()
  }, [testRun.id])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchResults = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('test_run_results')
      .select(`
        *,
        test_case:test_cases(*)
      `)
      .eq('test_run_id', testRun.id)
      .order('position', { ascending: true })

    if (!error && data) {
      setResults(data as EnrichedResult[])
    }
    setLoading(false)
  }

  const fetchAllTestCases = async () => {
    const { data } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', testRun.project_id)
      .order('title')

    if (data) {
      setAllTestCases(data)
    }
  }

  const updateTestRunStatus = async () => {
    // Update test run status based on actual database results
    const { data: allResults } = await supabase
      .from('test_run_results')
      .select('result_status')
      .eq('test_run_id', testRun.id)

    if (allResults) {
      const totalExecuted = allResults.filter(r => r.result_status !== 'untested').length
      const totalTests = allResults.length

      let runStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started'
      if (totalExecuted === totalTests && totalTests > 0) {
        runStatus = 'completed'
      } else if (totalExecuted > 0) {
        runStatus = 'in_progress'
      }

      await supabase
        .from('test_runs')
        .update({ run_status: runStatus })
        .eq('id', testRun.id)
    }
  }

  const handleStatusChange = async (resultId: string, status: ResultStatus) => {
    await supabase
      .from('test_run_results')
      .update({
        result_status: status,
        executed_by: user?.id,
        executed_at: new Date().toISOString(),
      })
      .eq('id', resultId)

    await updateTestRunStatus()
    fetchResults()
    onUpdate()
  }

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
    await updateTestRunStatus()
    setSelectedIds(new Set())
    fetchResults()
    onUpdate()
  }

  const handleRemoveTestCase = async (resultId: string) => {
    if (confirm('Remove this test case from the test run?')) {
      await supabase.from('test_run_results').delete().eq('id', resultId)
      fetchResults()
      onUpdate()
    }
  }

  const handleBulkRemove = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one test case')
      return
    }

    if (confirm(`Remove ${selectedIds.size} test case(s) from the test run?`)) {
      const deletes = Array.from(selectedIds).map(id =>
        supabase.from('test_run_results').delete().eq('id', id)
      )

      await Promise.all(deletes)
      setSelectedIds(new Set())
      fetchResults()
      onUpdate()
    }
  }

  const handleAddTestCases = async (testCaseIds: string[]) => {
    // Get current max position
    const maxPosition = results.length > 0
      ? Math.max(...results.map(r => r.position || 0))
      : -1

    const inserts = testCaseIds.map((testCaseId, index) => ({
      test_run_id: testRun.id,
      test_case_id: testCaseId,
      result_status: 'untested' as ResultStatus,
      position: maxPosition + 1 + index,
    }))

    await supabase.from('test_run_results').insert(inserts)
    setShowAddModal(false)
    fetchResults()
    onUpdate()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = results.findIndex(r => r.id === active.id)
    const newIndex = results.findIndex(r => r.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const newResults = arrayMove(results, oldIndex, newIndex)
    setResults(newResults)

    // Update positions in database
    const updates = newResults.map((result, index) =>
      supabase
        .from('test_run_results')
        .update({ position: index })
        .eq('id', result.id)
    )

    await Promise.all(updates)
    onUpdate()
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredResults.map(r => r.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleReportBug = (result: EnrichedResult) => {
    if (!currentProject) return

    // Navigate to bugs page with pre-filled data via URL state
    const bugData = {
      test_run_id: testRun.id,
      test_case_id: result.test_case_id,
      test_run_result_id: result.id,
      title: `Issue in: ${result.test_case?.title || 'Test Case'}`,
      severity: 'medium' as const,
      environment: testRun.environment || 'staging',
    }

    navigate(`/projects/${currentProject.id}/bugs`, {
      state: { prefillData: bugData }
    })
  }

  const openDetailWithExecution = (result: EnrichedResult) => {
    setSelectedTestCase(result.test_case || null)
    setSelectedResult(result)
    setExecutionData({
      result_status: result.result_status,
      actual_result: result.actual_result || '',
      comments: result.comments || '',
      attachments: (result.attachments as unknown as Attachment[]) || [],
      execution_time: result.execution_time || 0
    })
    setShowDetailModal(true)
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedTestCase(null)
    setSelectedResult(null)
    setExecutionData({
      result_status: 'untested',
      actual_result: '',
      comments: '',
      attachments: [],
      execution_time: 0
    })
  }

  const updateExecutionData = (updates: Partial<ExecutionState>) => {
    setExecutionData(prev => ({ ...prev, ...updates }))
  }

  const handleAddLink = () => {
    const url = prompt('Enter Google Drive link (or any URL):')
    if (!url) return

    const name = prompt('Enter link name (optional):') || (() => {
      try {
        return new URL(url).hostname
      } catch {
        return 'Link'
      }
    })()

    updateExecutionData({
      attachments: [...executionData.attachments, {
        type: 'link',
        url,
        name
      }]
    })
  }

  const handleRemoveAttachment = (index: number) => {
    updateExecutionData({
      attachments: executionData.attachments.filter((_, i) => i !== index)
    })
  }

  const saveExecutionData = async () => {
    if (!selectedResult || !user) return

    setSavingExecution(true)
    try {
      const resultData = {
        result_status: executionData.result_status,
        actual_result: executionData.actual_result || null,
        comments: executionData.comments || null,
        attachments: executionData.attachments.length > 0 ? executionData.attachments : null,
        execution_time: executionData.execution_time || 0,
        executed_by: user.id,
        executed_at: new Date().toISOString()
      }

      await supabase
        .from('test_run_results')
        .update(resultData)
        .eq('id', selectedResult.id)

      await updateTestRunStatus()
      fetchResults()
      onUpdate()
      closeDetailModal()
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save result')
    } finally {
      setSavingExecution(false)
    }
  }

  const getStatusIcon = (status: ResultStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'skipped':
        return <Clock className="w-5 h-5 text-gray-600" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  const availableTestCases = allTestCases.filter(
    tc =>
      !results.some(r => r.test_case_id === tc.id) &&
      tc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter results by status and search query
  const filteredResults = results
    .filter(r => {
      // Filter by status
      if (statusFilter !== 'all' && r.result_status !== statusFilter) {
        return false
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const title = r.test_case?.title?.toLowerCase() || ''
        const description = r.test_case?.description?.toLowerCase() || ''
        return title.includes(query) || description.includes(query)
      }
      return true
    })

  const stats = {
    total: results.length,
    passed: results.filter(r => r.result_status === 'passed').length,
    failed: results.filter(r => r.result_status === 'failed').length,
    blocked: results.filter(r => r.result_status === 'blocked').length,
    skipped: results.filter(r => r.result_status === 'skipped').length,
    untested: results.filter(r => r.result_status === 'untested').length,
  }

  // Sortable Item Component
  function SortableTestCaseItem({ result }: { result: EnrichedResult }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: result.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`p-4 rounded-lg border ${
          selectedIds.has(result.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing hover:text-primary-600"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>

          <input
            type="checkbox"
            checked={selectedIds.has(result.id)}
            onChange={() => toggleSelect(result.id)}
            className="mt-1 rounded"
          />

          <div className="flex-shrink-0 mt-1">{getStatusIcon(result.result_status)}</div>

          <div className="flex-1">
            <h4
              className="font-medium text-gray-900 hover:text-primary-600 cursor-pointer"
              onClick={() => openDetailWithExecution(result)}
            >
              {result.test_case?.title || 'Unknown Test Case'}
            </h4>
            {result.test_case && (
              <div className="flex gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    result.test_case.test_type === 'api'
                      ? 'bg-purple-100 text-purple-700'
                      : result.test_case.test_type === 'functional_mobile'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {result.test_case.test_type === 'api' ? 'API' : result.test_case.test_type === 'functional_mobile' ? 'Mobile' : 'Web'}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    result.test_case.priority === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : result.test_case.priority === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {result.test_case.priority}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1">
            <button
              onClick={() => openDetailWithExecution(result)}
              className="p-2 hover:bg-blue-50 rounded"
              title="View Details & Execute"
            >
              <FileText className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={() => handleStatusChange(result.id, 'passed')}
              className="p-2 hover:bg-green-50 rounded"
              title="Pass"
            >
              <CheckCircle className="w-4 h-4 text-green-600" />
            </button>
            <button
              onClick={() => handleStatusChange(result.id, 'failed')}
              className="p-2 hover:bg-red-50 rounded"
              title="Fail"
            >
              <XCircle className="w-4 h-4 text-red-600" />
            </button>
            <button
              onClick={() => handleStatusChange(result.id, 'blocked')}
              className="p-2 hover:bg-yellow-50 rounded"
              title="Block"
            >
              <AlertCircle className="w-4 h-4 text-yellow-600" />
            </button>
            <button
              onClick={() => handleStatusChange(result.id, 'skipped')}
              className="p-2 hover:bg-gray-50 rounded"
              title="Skip"
            >
              <Clock className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => handleReportBug(result)}
              className="p-2 hover:bg-orange-50 rounded"
              title="Report Bug"
            >
              <Bug className="w-4 h-4 text-orange-600" />
            </button>
            <button
              onClick={() => handleRemoveTestCase(result.id)}
              className="p-2 hover:bg-red-50 rounded"
              title="Remove"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{testRun.name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{testRun.description}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-700">✓ {stats.passed}</span>
                <span className="text-red-700">✗ {stats.failed}</span>
                <span className="text-yellow-700">⊘ {stats.blocked}</span>
                <span className="text-gray-700">↷ {stats.skipped}</span>
                <span className="text-gray-600">− {stats.untested}</span>
                <span className="text-gray-600">Total: {stats.total}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onCopyLink && (
                <button
                  onClick={onCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Copy shareable link"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkStatusChange('passed')}
                >
                  <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                  Pass
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkStatusChange('failed')}
                >
                  <XCircle className="w-4 h-4 mr-1 text-red-600" />
                  Fail
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkStatusChange('blocked')}
                >
                  <AlertCircle className="w-4 h-4 mr-1 text-yellow-600" />
                  Block
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkStatusChange('skipped')}
                >
                  <Clock className="w-4 h-4 mr-1 text-gray-600" />
                  Skip
                </Button>
                <Button size="sm" variant="secondary" onClick={handleBulkRemove}>
                  <Trash2 className="w-4 h-4 mr-1 text-red-600" />
                  Remove
                </Button>
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Test Cases
                </Button>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredResults.length && filteredResults.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                  Select All
                </label>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ResultStatus | 'all')}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All ({stats.total})</option>
                  <option value="passed">✓ Passed ({stats.passed})</option>
                  <option value="failed">✗ Failed ({stats.failed})</option>
                  <option value="blocked">⊘ Blocked ({stats.blocked})</option>
                  <option value="skipped">↷ Skipped ({stats.skipped})</option>
                  <option value="untested">− Untested ({stats.untested})</option>
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <Input
              placeholder="Search test cases by title or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Test Cases List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No test cases in this run. Click "Add Test Cases" to get started.
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No test cases match the selected filter.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredResults.map(r => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {filteredResults.map(result => (
                    <SortableTestCaseItem key={result.id} result={result} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add Test Cases Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Add Test Cases</CardTitle>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <Input
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="mb-4"
              />

              {availableTestCases.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchQuery
                    ? 'No test cases found matching your search'
                    : 'All test cases are already added to this run'}
                </p>
              ) : (
                <div className="space-y-2">
                  {availableTestCases.map(tc => (
                    <div
                      key={tc.id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-primary-500 cursor-pointer"
                      onClick={() => handleAddTestCases([tc.id])}
                    >
                      <h4 className="font-medium text-gray-900">{tc.title}</h4>
                      <div className="flex gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            tc.test_type === 'api'
                              ? 'bg-purple-100 text-purple-700'
                              : tc.test_type === 'functional_mobile'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {tc.test_type === 'api' ? 'API' : tc.test_type === 'functional_mobile' ? 'Mobile' : 'Web'}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            tc.priority === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : tc.priority === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {tc.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Case Detail Modal with Execution */}
      {showDetailModal && selectedTestCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle>{selectedTestCase.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        selectedTestCase.test_type === 'api'
                          ? 'bg-purple-100 text-purple-700'
                          : selectedTestCase.test_type === 'functional_mobile'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {selectedTestCase.test_type === 'api' ? 'API' : selectedTestCase.test_type === 'functional_mobile' ? 'Mobile' : 'Web'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        selectedTestCase.priority === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : selectedTestCase.priority === 'high'
                          ? 'bg-orange-100 text-orange-700'
                          : selectedTestCase.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedTestCase.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        selectedTestCase.status === 'ready'
                          ? 'bg-green-100 text-green-700'
                          : selectedTestCase.status === 'draft'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {selectedTestCase.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Test Case Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Test Case Details</h3>

                  {/* Description */}
                  {selectedTestCase.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">{selectedTestCase.description}</p>
                    </div>
                  )}

                  {/* Preconditions */}
                  {selectedTestCase.preconditions && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Preconditions</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-blue-50 p-3 rounded">{selectedTestCase.preconditions}</p>
                    </div>
                  )}

                  {/* Steps */}
                  {selectedTestCase.steps && Array.isArray(selectedTestCase.steps) && selectedTestCase.steps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Test Steps</h4>
                      <div className="space-y-2">
                        {(selectedTestCase.steps as Array<{ step_number: number; action: string; expected_result: string }>).map((step, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 text-sm">
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium">
                                {step.step_number || index + 1}
                              </span>
                              <div className="flex-1 space-y-1">
                                <div>
                                  <span className="text-xs font-medium text-gray-500">Action:</span>
                                  <p className="text-gray-700 whitespace-pre-wrap">{step.action}</p>
                                </div>
                                {step.expected_result && (
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Expected:</span>
                                    <p className="text-green-700 whitespace-pre-wrap">{step.expected_result}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expected Result (legacy) */}
                  {selectedTestCase.expected_result && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Expected Result</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-green-50 p-3 rounded">{selectedTestCase.expected_result}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedTestCase.tags && selectedTestCase.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedTestCase.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Execution Form */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Execution</h3>

                  {/* Status Selection */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Result Status</h4>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => updateExecutionData({ result_status: 'passed' })}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          executionData.result_status === 'passed'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${
                          executionData.result_status === 'passed' ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        <span className="text-xs font-medium">Passed</span>
                      </button>

                      <button
                        onClick={() => updateExecutionData({ result_status: 'failed' })}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          executionData.result_status === 'failed'
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <XCircle className={`w-5 h-5 mx-auto mb-1 ${
                          executionData.result_status === 'failed' ? 'text-red-600' : 'text-gray-400'
                        }`} />
                        <span className="text-xs font-medium">Failed</span>
                      </button>

                      <button
                        onClick={() => updateExecutionData({ result_status: 'blocked' })}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          executionData.result_status === 'blocked'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200 hover:border-yellow-300'
                        }`}
                      >
                        <AlertCircle className={`w-5 h-5 mx-auto mb-1 ${
                          executionData.result_status === 'blocked' ? 'text-yellow-600' : 'text-gray-400'
                        }`} />
                        <span className="text-xs font-medium">Blocked</span>
                      </button>

                      <button
                        onClick={() => updateExecutionData({ result_status: 'skipped' })}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          executionData.result_status === 'skipped'
                            ? 'border-gray-500 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Clock className={`w-5 h-5 mx-auto mb-1 ${
                          executionData.result_status === 'skipped' ? 'text-gray-600' : 'text-gray-400'
                        }`} />
                        <span className="text-xs font-medium">Skipped</span>
                      </button>
                    </div>
                  </div>

                  {/* Actual Result */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Result
                    </label>
                    <textarea
                      value={executionData.actual_result}
                      onChange={(e) => updateExecutionData({ actual_result: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={3}
                      placeholder="Describe what actually happened..."
                    />
                  </div>

                  {/* Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comments
                    </label>
                    <textarea
                      value={executionData.comments}
                      onChange={(e) => updateExecutionData({ comments: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={2}
                      placeholder="Additional notes..."
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments
                    </label>
                    <Button type="button" variant="secondary" size="sm" onClick={handleAddLink}>
                      <LinkIcon className="w-4 h-4 mr-1" />
                      Add Link
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: Upload to Google Drive, then paste link here
                    </p>

                    {executionData.attachments.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {executionData.attachments.map((att, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {att.name}
                            </a>
                            <button
                              onClick={() => handleRemoveAttachment(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Execution Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Execution Time (minutes)
                    </label>
                    <Input
                      type="number"
                      value={executionData.execution_time}
                      onChange={(e) => updateExecutionData({ execution_time: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>

                  {/* Report Bug Button */}
                  {selectedResult && (
                    <div className="pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          handleReportBug(selectedResult)
                          closeDetailModal()
                        }}
                        className="w-full"
                      >
                        <Bug className="w-4 h-4 mr-2" />
                        Report Bug
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            {/* Footer Actions */}
            <div className="border-t p-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeDetailModal}>
                Cancel
              </Button>
              <Button onClick={saveExecutionData} disabled={savingExecution}>
                {savingExecution ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
