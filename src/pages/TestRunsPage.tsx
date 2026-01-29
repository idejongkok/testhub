import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import TestRunExecutor from '@/components/TestRunExecutor'
import TestRunDetail from '@/components/TestRunDetail'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, PlayCircle, X, Edit2, Trash2, FileText, List, Copy, Link2, Check, Search, Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database, RunStatus } from '@/types/database'
import { formatDateTime } from '@/lib/utils'

type TestRun = Database['public']['Tables']['test_runs']['Row']
type TestRunResult = Database['public']['Tables']['test_run_results']['Row']
type TestCase = Database['public']['Tables']['test_cases']['Row']
type TestPlan = Database['public']['Tables']['test_plans']['Row']

export default function TestRunsPage() {
  const { currentProject } = useProjectStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [testRuns, setTestRuns] = useState<TestRun[]>([])
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingRun, setEditingRun] = useState<TestRun | null>(null)
  const [copyingFromRun, setCopyingFromRun] = useState<TestRun | null>(null)
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [runResults, setRunResults] = useState<TestRunResult[]>([])
  const [linkCopied, setLinkCopied] = useState(false)

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all')
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environment: 'staging',
    test_plan_id: '',
  })

  useEffect(() => {
    if (currentProject) {
      fetchTestRuns()
      fetchTestPlans()
    }
  }, [currentProject])

  // Handle runId URL parameter
  useEffect(() => {
    const runId = searchParams.get('runId')
    if (runId && testRuns.length > 0) {
      const run = testRuns.find(r => r.id === runId)
      if (run) {
        setSelectedRun(run)
        setShowDetailModal(true)
      }
    }
  }, [searchParams, testRuns])

  // Open test run detail and update URL
  const openRunDetail = (run: TestRun) => {
    setSelectedRun(run)
    setShowDetailModal(true)
    setSearchParams({ runId: run.id })
  }

  // Close test run detail and remove URL param
  const closeRunDetail = () => {
    setShowDetailModal(false)
    setSelectedRun(null)
    searchParams.delete('runId')
    setSearchParams(searchParams)
  }

  // Copy shareable link to clipboard
  const copyRunLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?runId=${selectedRun?.id}`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const fetchTestRuns = async () => {
    if (!currentProject) return
    setLoading(true)
    const { data, error } = await supabase
      .from('test_runs')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTestRuns(data)
    }
    setLoading(false)
  }

  const fetchTestPlans = async () => {
    if (!currentProject) return
    const { data } = await supabase
      .from('test_plans')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('name')

    if (data) {
      setTestPlans(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject) return

    if (editingRun) {
      // Update existing
      const { error } = await supabase
        .from('test_runs')
        .update({
          name: formData.name,
          description: formData.description,
          environment: formData.environment,
        })
        .eq('id', editingRun.id)

      if (!error) {
        fetchTestRuns()
        resetForm()
      }
    } else {
      // Create new
      let newTestPlanId: string | null = formData.test_plan_id || null

      // If copying from a run that has a test plan, create a new test plan first
      if (copyingFromRun && copyingFromRun.test_plan_id) {
        // Fetch source test plan details
        const { data: sourcePlan } = await supabase
          .from('test_plans')
          .select('*')
          .eq('id', copyingFromRun.test_plan_id)
          .single()

        if (sourcePlan) {
          // Create new test plan
          const { data: newPlan, error: planError } = await supabase
            .from('test_plans')
            .insert([{
              project_id: currentProject.id,
              name: `Copy of ${sourcePlan.name}`,
              description: sourcePlan.description,
            }])
            .select()
            .single()

          if (!planError && newPlan) {
            newTestPlanId = newPlan.id

            // Copy test plan cases to new plan
            const { data: sourcePlanCases } = await supabase
              .from('test_plan_cases')
              .select('test_case_id, position')
              .eq('test_plan_id', copyingFromRun.test_plan_id)
              .order('position', { ascending: true })

            if (sourcePlanCases && sourcePlanCases.length > 0) {
              await supabase
                .from('test_plan_cases')
                .insert(
                  sourcePlanCases.map((pc, index) => ({
                    test_plan_id: newPlan.id,
                    test_case_id: pc.test_case_id,
                    position: index,
                  }))
                )
            }
          }
        }
      }

      const { data: newRun, error } = await supabase
        .from('test_runs')
        .insert([{
          project_id: currentProject.id,
          name: formData.name,
          description: formData.description,
          environment: formData.environment,
          test_plan_id: newTestPlanId,
          run_status: 'not_started',
        }])
        .select()
        .single()

      if (!error && newRun && copyingFromRun) {
        // Copy test cases from existing run
        const { data: sourceResults, error: sourceError } = await supabase
          .from('test_run_results')
          .select('test_case_id, position')
          .eq('test_run_id', copyingFromRun.id)
          .order('position', { ascending: true })

        if (sourceError) {
          console.error('Error fetching source run results:', sourceError)
          alert('Failed to load test cases from source run: ' + sourceError.message)
        } else if (sourceResults && sourceResults.length > 0) {
          const { error: insertError } = await supabase
            .from('test_run_results')
            .insert(
              sourceResults.map((sr, index) => ({
                test_run_id: newRun.id,
                test_case_id: sr.test_case_id,
                result_status: 'untested' as const,
                position: index,
              }))
            )

          if (insertError) {
            console.error('Error inserting test run results:', insertError)
            alert('Failed to copy test cases to new run: ' + insertError.message)
          }
        }
      } else if (!error && newRun && formData.test_plan_id) {
        // Copy test cases from plan
        const { data: planCases, error: planError } = await supabase
          .from('test_plan_cases')
          .select('test_case_id')
          .eq('test_plan_id', formData.test_plan_id)

        if (planError) {
          console.error('Error fetching test plan cases:', planError)
          alert('Failed to load test cases from test plan: ' + planError.message)
        } else if (planCases && planCases.length > 0) {
          const { error: insertError } = await supabase
            .from('test_run_results')
            .insert(
              planCases.map((pc, index) => ({
                test_run_id: newRun.id,
                test_case_id: pc.test_case_id,
                result_status: 'untested' as const,
                position: index,
              }))
            )

          if (insertError) {
            console.error('Error inserting test run results:', insertError)
            alert('Failed to copy test cases to test run: ' + insertError.message)
          }
        } else if (planCases && planCases.length === 0) {
          alert('The selected test plan has no test cases. Please add test cases to the test plan first.')
        }
      }

      if (!error) {
        fetchTestRuns()
        resetForm()
      }
    }
  }

  const handleEdit = (run: TestRun) => {
    setEditingRun(run)
    setFormData({
      name: run.name,
      description: run.description || '',
      environment: run.environment || 'staging',
      test_plan_id: run.test_plan_id || '',
    })
    setShowModal(true)
  }

  const handleCopy = (run: TestRun) => {
    setCopyingFromRun(run)
    setFormData({
      name: `Copy of ${run.name}`,
      description: run.description || '',
      environment: run.environment || 'staging',
      test_plan_id: '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this test run? All results will be lost.')) {
      await supabase.from('test_runs').delete().eq('id', id)
      fetchTestRuns()
    }
  }

  const handleStatusChange = async (runId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    await supabase
      .from('test_runs')
      .update({ run_status: newStatus })
      .eq('id', runId)

    fetchTestRuns()
  }

  const handleViewReport = (runId: string) => {
    navigate(`/test-runs/${runId}/report`)
  }

  const handleManage = (run: TestRun) => {
    openRunDetail(run)
  }

  const handleExecute = async (run: TestRun) => {
    setSelectedRun(run)

    // Fetch test cases for this run
    const { data: results } = await supabase
      .from('test_run_results')
      .select('*, test_cases(*)')
      .eq('test_run_id', run.id)
      .order('position', { ascending: true })

    if (results && results.length > 0) {
      const cases = results.map((r: any) => r.test_cases).filter(Boolean)
      setTestCases(cases)
      setRunResults(results)
      setShowExecuteModal(true)
    } else {
      alert('No test cases found for this run. Please add test cases first.')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', environment: 'staging', test_plan_id: '' })
    setShowModal(false)
    setEditingRun(null)
    setCopyingFromRun(null)
  }

  const getStatusColor = (status: RunStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get unique environments for filter dropdown
  const uniqueEnvironments = [...new Set(testRuns.map(r => r.environment).filter(Boolean))] as string[]

  // Filter test runs
  const filteredRuns = testRuns.filter(run => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = searchQuery === '' ||
      run.name.toLowerCase().includes(query) ||
      run.description?.toLowerCase().includes(query)

    const matchesStatus = statusFilter === 'all' || run.run_status === statusFilter
    const matchesEnvironment = environmentFilter === 'all' || run.environment === environmentFilter

    return matchesSearch && matchesStatus && matchesEnvironment
  })

  // Count active filters
  const activeFilterCount = [
    statusFilter !== 'all',
    environmentFilter !== 'all',
  ].filter(Boolean).length

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setEnvironmentFilter('all')
  }

  // Stats
  const stats = {
    total: testRuns.length,
    notStarted: testRuns.filter(r => r.run_status === 'not_started').length,
    inProgress: testRuns.filter(r => r.run_status === 'in_progress').length,
    completed: testRuns.filter(r => r.run_status === 'completed').length,
  }

  if (!currentProject) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Please select a project first</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-gray-50 pb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Test Runs</h1>
              <p className="text-gray-600 mt-1">{currentProject.name}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-gray-500">Not Started: {stats.notStarted}</span>
                <span className="text-blue-700">In Progress: {stats.inProgress}</span>
                <span className="text-green-700">Completed: {stats.completed}</span>
                <span className="text-gray-600">Total: {stats.total}</span>
              </div>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Test Run
            </Button>
          </div>

          {/* Filters */}
          <Card className="shadow-sm">
            <CardContent className="py-4">
              {/* Main Filter Row */}
              <div className="flex flex-wrap gap-3 items-center">
                <Input
                  placeholder="Search test runs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px] max-w-sm"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RunStatus | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={environmentFilter}
                  onChange={(e) => setEnvironmentFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Environments</option>
                  <option value="staging">Staging</option>
                  <option value="preproduction">Preproduction</option>
                  <option value="production">Production</option>
                </select>

                {(activeFilterCount > 0 || searchQuery) && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                )}
              </div>

              {/* Results Summary */}
              {(searchQuery || activeFilterCount > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Found <span className="font-medium text-gray-900">{filteredRuns.length}</span> of {testRuns.length} test runs
                  </span>
                  {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {statusFilter !== 'all' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          Status: {statusFilter.replace('_', ' ')}
                        </span>
                      )}
                      {environmentFilter !== 'all' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          Env: {environmentFilter}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Test Runs List - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : filteredRuns.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <PlayCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No test runs found</h3>
                <p className="text-gray-600 mb-4">
                  {testRuns.length === 0
                    ? 'No test runs yet. Create one to get started.'
                    : 'No test runs match the selected filters'}
                </p>
                {testRuns.length === 0 && (
                  <Button onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Test Run
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRuns.map(run => (
              <Card key={run.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{run.name}</h3>
                      {run.description && (
                        <p className="text-gray-600 mt-1">{run.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm items-center">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Status:</label>
                          <select
                            value={run.run_status}
                            onChange={(e) => handleStatusChange(run.id, e.target.value as 'not_started' | 'in_progress' | 'completed')}
                            className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getStatusColor(run.run_status)}`}
                          >
                            <option value="not_started">not_started</option>
                            <option value="in_progress">in_progress</option>
                            <option value="completed">completed</option>
                          </select>
                        </div>
                        <span className="text-gray-600">
                          Environment: <span className="font-medium">{run.environment}</span>
                        </span>
                        <span className="text-gray-600">
                          Created: {formatDateTime(run.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleManage(run)}
                      >
                        <List className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
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
                        onClick={() => handleCopy(run)}
                        title="Copy Test Run"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDelete(run.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingRun ? 'Edit Test Run' : copyingFromRun ? 'Copy Test Run' : 'Create New Test Run'}</CardTitle>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Test Run Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Environment
                    </label>
                    <select
                      value={formData.environment}
                      onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="staging">Staging</option>
                      <option value="preproduction">Preproduction</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  {!editingRun && !copyingFromRun && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Test Plan (optional)
                      </label>
                      <select
                        value={formData.test_plan_id}
                        onChange={(e) => setFormData({ ...formData, test_plan_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">-- Select Test Plan --</option>
                        {testPlans.map(plan => (
                          <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {copyingFromRun && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium">Copying from:</span> {copyingFromRun.name}
                      <br />
                      <span className="text-xs">All test cases will be copied with status reset to "untested"</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingRun ? 'Update' : copyingFromRun ? 'Copy' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detail Modal - Manage Test Cases */}
        {showDetailModal && selectedRun && (
          <TestRunDetail
            testRun={selectedRun}
            onClose={closeRunDetail}
            onUpdate={() => {
              fetchTestRuns()
            }}
            onCopyLink={copyRunLink}
            linkCopied={linkCopied}
          />
        )}

        {/* Execute Modal */}
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
      </div>
    </Layout>
  )
}
