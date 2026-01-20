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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database, ResultStatus } from '@/types/database'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'

type TestCase = Database['public']['Tables']['test_cases']['Row']
type TestRunResult = Database['public']['Tables']['test_run_results']['Row']
type TestRun = Database['public']['Tables']['test_runs']['Row']

interface TestRunDetailProps {
  testRun: TestRun
  onClose: () => void
  onUpdate: () => void
}

interface EnrichedResult extends TestRunResult {
  test_case?: TestCase
}

export default function TestRunDetail({ testRun, onClose, onUpdate }: TestRunDetailProps) {
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

  useEffect(() => {
    fetchResults()
    fetchAllTestCases()
  }, [testRun.id])

  const fetchResults = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('test_run_results')
      .select(`
        *,
        test_case:test_cases(*)
      `)
      .eq('test_run_id', testRun.id)

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

  // Filter results by status
  const filteredResults = statusFilter === 'all'
    ? results
    : results.filter(r => r.result_status === statusFilter)

  const stats = {
    total: results.length,
    passed: results.filter(r => r.result_status === 'passed').length,
    failed: results.filter(r => r.result_status === 'failed').length,
    blocked: results.filter(r => r.result_status === 'blocked').length,
    skipped: results.filter(r => r.result_status === 'skipped').length,
    untested: results.filter(r => r.result_status === 'untested').length,
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
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
          <div className="mb-4 flex justify-between items-center">
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
            <div className="space-y-2">
              {filteredResults.map(result => (
                <div
                  key={result.id}
                  className={`p-4 rounded-lg border ${
                    selectedIds.has(result.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(result.id)}
                      onChange={() => toggleSelect(result.id)}
                      className="mt-1 rounded"
                    />

                    <div className="flex-shrink-0 mt-1">{getStatusIcon(result.result_status)}</div>

                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
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
                            {result.test_case.test_type}
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
              ))}
            </div>
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
                          {tc.test_type}
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
    </div>
  )
}
