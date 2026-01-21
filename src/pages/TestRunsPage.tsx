import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import TestRunExecutor from '@/components/TestRunExecutor'
import TestRunDetail from '@/components/TestRunDetail'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, PlayCircle, X, Edit2, Trash2, FileText, List } from 'lucide-react'
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
  const [testRuns, setTestRuns] = useState<TestRun[]>([])
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingRun, setEditingRun] = useState<TestRun | null>(null)
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [runResults, setRunResults] = useState<TestRunResult[]>([])

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
      const { data: newRun, error } = await supabase
        .from('test_runs')
        .insert([{
          project_id: currentProject.id,
          name: formData.name,
          description: formData.description,
          environment: formData.environment,
          test_plan_id: formData.test_plan_id || null,
          run_status: 'not_started',
        }])
        .select()
        .single()

      if (!error && newRun && formData.test_plan_id) {
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

  const handleDelete = async (id: string) => {
    if (confirm('Delete this test run? All results will be lost.')) {
      await supabase.from('test_runs').delete().eq('id', id)
      fetchTestRuns()
    }
  }

  const handleViewReport = (runId: string) => {
    navigate(`/test-runs/${runId}/report`)
  }

  const handleManage = (run: TestRun) => {
    setSelectedRun(run)
    setShowDetailModal(true)
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Test Runs</h1>
            <p className="text-gray-600 mt-1">{currentProject.name}</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Test Run
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : testRuns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600">No test runs yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {testRuns.map(run => (
              <Card key={run.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{run.name}</h3>
                      {run.description && (
                        <p className="text-gray-600 mt-1">{run.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(run.run_status)}`}>
                          {run.run_status}
                        </span>
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

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingRun ? 'Edit Test Run' : 'Create New Test Run'}</CardTitle>
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
                      <option value="production">Production</option>
                      <option value="development">Development</option>
                    </select>
                  </div>
                  {!editingRun && (
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
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingRun ? 'Update' : 'Create'}
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
            onClose={() => {
              setShowDetailModal(false)
              setSelectedRun(null)
            }}
            onUpdate={() => {
              fetchTestRuns()
            }}
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
