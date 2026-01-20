import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, PlayCircle, Eye, Upload, Link as LinkIcon, X, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database, RunStatus, ResultStatus } from '@/types/database'
import { formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

type TestRun = Database['public']['Tables']['test_runs']['Row']
type TestRunResult = Database['public']['Tables']['test_run_results']['Row']
type TestCase = Database['public']['Tables']['test_cases']['Row']

interface Attachment {
  type: 'upload' | 'link'
  url: string
  name: string
}

export default function TestRunsPage() {
  const { currentProject } = useProjectStore()
  const { user } = useAuthStore()
  const [testRuns, setTestRuns] = useState<TestRun[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [runResults, setRunResults] = useState<TestRunResult[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environment: 'staging',
  })

  const [executionData, setExecutionData] = useState<{
    [key: string]: {
      result_status: ResultStatus
      actual_result: string
      comments: string
      attachments: Attachment[]
      execution_time: number
    }
  }>({})

  const [uploadingFile, setUploadingFile] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  useEffect(() => {
    if (currentProject) {
      fetchTestRuns()
      fetchTestCases()
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

  const fetchTestCases = async () => {
    if (!currentProject) return
    const { data } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })
    
    if (data) {
      setTestCases(data)
    }
  }

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject) return

    const { data, error } = await supabase
      .from('test_runs')
      .insert([{
        project_id: currentProject.id,
        name: formData.name,
        description: formData.description,
        environment: formData.environment,
        run_status: 'not_started',
      }])
      .select()
      .single()

    if (!error && data) {
      // Create result entries for all ready test cases
      const results = testCases.map(tc => ({
        test_run_id: data.id,
        test_case_id: tc.id,
        result_status: 'untested' as ResultStatus,
      }))

      await supabase.from('test_run_results').insert(results)
      
      fetchTestRuns()
      setShowModal(false)
      setFormData({ name: '', description: '', environment: 'staging' })
    }
  }

  const handleExecuteRun = async (run: TestRun) => {
    setSelectedRun(run)
    
    // Fetch existing results
    const { data } = await supabase
      .from('test_run_results')
      .select('*, test_cases(*)')
      .eq('test_run_id', run.id)
    
    if (data) {
      setRunResults(data)
      
      // Initialize execution data
      const initData: any = {}
      data.forEach(result => {
        initData[result.test_case_id] = {
          result_status: result.result_status,
          actual_result: result.actual_result || '',
          comments: result.comments || '',
          attachments: result.attachments ? (result.attachments as any[]).map(a => ({
            type: a.type,
            url: a.url,
            name: a.name
          })) : [],
          execution_time: result.execution_time || 0,
        }
      })
      setExecutionData(initData)
    }
    
    setShowExecuteModal(true)

    // Update run status to in_progress if not started
    if (run.run_status === 'not_started') {
      await supabase
        .from('test_runs')
        .update({ 
          run_status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', run.id)
    }
  }

  const handleFileUpload = async (testCaseId: string, file: File) => {
    if (!user || !selectedRun) return
    setUploadingFile(true)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${selectedRun.id}/${testCaseId}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('test-attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('test-attachments')
        .getPublicUrl(fileName)

      // Add to attachments
      const newAttachment: Attachment = {
        type: 'upload',
        url: publicUrl,
        name: file.name
      }

      setExecutionData(prev => ({
        ...prev,
        [testCaseId]: {
          ...prev[testCaseId],
          attachments: [...(prev[testCaseId]?.attachments || []), newAttachment]
        }
      }))
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleAddLink = (testCaseId: string) => {
    if (!linkUrl.trim()) return

    const newAttachment: Attachment = {
      type: 'link',
      url: linkUrl,
      name: linkUrl.split('/').pop() || 'External Link'
    }

    setExecutionData(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        attachments: [...(prev[testCaseId]?.attachments || []), newAttachment]
      }
    }))

    setLinkUrl('')
  }

  const handleRemoveAttachment = (testCaseId: string, index: number) => {
    setExecutionData(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        attachments: prev[testCaseId].attachments.filter((_, i) => i !== index)
      }
    }))
  }

  const handleSaveResult = async (testCaseId: string) => {
    if (!selectedRun || !user) return

    const data = executionData[testCaseId]
    
    await supabase
      .from('test_run_results')
      .update({
        result_status: data.result_status,
        actual_result: data.actual_result,
        comments: data.comments,
        attachments: data.attachments,
        execution_time: data.execution_time,
        executed_by: user.id,
        executed_at: new Date().toISOString(),
      })
      .eq('test_run_id', selectedRun.id)
      .eq('test_case_id', testCaseId)

    // Refresh results
    const { data: updatedResults } = await supabase
      .from('test_run_results')
      .select('*, test_cases(*)')
      .eq('test_run_id', selectedRun.id)
    
    if (updatedResults) {
      setRunResults(updatedResults)
    }
  }

  const handleCompleteRun = async () => {
    if (!selectedRun) return

    await supabase
      .from('test_runs')
      .update({
        run_status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', selectedRun.id)

    fetchTestRuns()
    setShowExecuteModal(false)
  }

  const getStatusColor = (status: ResultStatus) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'blocked': return 'bg-yellow-100 text-yellow-700'
      case 'skipped': return 'bg-gray-100 text-gray-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-500'
    }
  }

  const getRunStats = (runId: string) => {
    const results = runResults.filter(r => r.test_run_id === runId)
    return {
      total: results.length,
      passed: results.filter(r => r.result_status === 'passed').length,
      failed: results.filter(r => r.result_status === 'failed').length,
      blocked: results.filter(r => r.result_status === 'blocked').length,
      untested: results.filter(r => r.result_status === 'untested').length,
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
        <div className="flex justify-between items-center mb-8">
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : testRuns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <PlayCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No test runs yet</h3>
              <p className="text-gray-600 mb-4">Create your first test run</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Test Run
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {testRuns.map((run) => (
              <Card key={run.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          run.run_status === 'completed' ? 'bg-green-100 text-green-700' :
                          run.run_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {run.run_status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700">
                          {run.environment}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {run.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {run.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Started: {formatDateTime(run.started_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleExecuteRun(run)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {run.run_status === 'completed' ? 'View' : 'Execute'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Run Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Create New Test Run</CardTitle>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRun} className="space-y-4">
                  <Input
                    label="Run Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Sprint 1 - Smoke Test"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Test run description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="dev">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  <p className="text-sm text-gray-600">
                    This will include all {testCases.length} test cases from this project
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Test Run
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Execute Run Modal */}
        {showExecuteModal && selectedRun && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
            <Card className="w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <CardTitle>{selectedRun.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{selectedRun.environment}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRun.run_status !== 'completed' && (
                      <Button onClick={handleCompleteRun}>
                        Complete Run
                      </Button>
                    )}
                    <button
                      onClick={() => setShowExecuteModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {runResults.map((result: any) => {
                    const testCase = result.test_cases
                    const execData = executionData[testCase.id] || {
                      result_status: 'untested',
                      actual_result: '',
                      comments: '',
                      attachments: [],
                      execution_time: 0,
                    }

                    return (
                      <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{testCase.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{testCase.description}</p>
                          </div>
                          <select
                            value={execData.result_status}
                            onChange={(e) => setExecutionData(prev => ({
                              ...prev,
                              [testCase.id]: {
                                ...prev[testCase.id],
                                result_status: e.target.value as ResultStatus
                              }
                            }))}
                            className={`px-3 py-1 text-sm font-medium rounded ${getStatusColor(execData.result_status)}`}
                            disabled={selectedRun.run_status === 'completed'}
                          >
                            <option value="untested">Untested</option>
                            <option value="in_progress">In Progress</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="blocked">Blocked</option>
                            <option value="skipped">Skipped</option>
                          </select>
                        </div>

                        {selectedRun.run_status !== 'completed' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Actual Result
                              </label>
                              <textarea
                                value={execData.actual_result}
                                onChange={(e) => setExecutionData(prev => ({
                                  ...prev,
                                  [testCase.id]: { ...prev[testCase.id], actual_result: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                rows={2}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Comments
                              </label>
                              <textarea
                                value={execData.comments}
                                onChange={(e) => setExecutionData(prev => ({
                                  ...prev,
                                  [testCase.id]: { ...prev[testCase.id], comments: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                rows={2}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attachments (Screenshots/Evidence)
                              </label>
                              
                              <div className="flex gap-2 mb-3">
                                <label className="flex-1">
                                  <input
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleFileUpload(testCase.id, file)
                                    }}
                                    className="hidden"
                                    accept="image/*,.pdf"
                                  />
                                  <div className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-primary-500 transition-colors">
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    {uploadingFile ? 'Uploading...' : 'Upload File'}
                                  </div>
                                </label>
                                
                                <div className="flex-1 flex gap-2">
                                  <input
                                    type="text"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="Google Drive link..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleAddLink(testCase.id)}
                                    disabled={!linkUrl.trim()}
                                  >
                                    <LinkIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {execData.attachments.length > 0 && (
                                <div className="space-y-2">
                                  {execData.attachments.map((att, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex items-center gap-2">
                                        {att.type === 'upload' ? (
                                          <Upload className="w-4 h-4 text-gray-500" />
                                        ) : (
                                          <LinkIcon className="w-4 h-4 text-gray-500" />
                                        )}
                                        <span className="text-sm truncate">{att.name}</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <a
                                          href={att.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary-600 hover:text-primary-700"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                        <button
                                          onClick={() => handleRemoveAttachment(testCase.id, idx)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSaveResult(testCase.id)}
                              >
                                Save Result
                              </Button>
                            </div>
                          </div>
                        )}

                        {selectedRun.run_status === 'completed' && (
                          <div className="space-y-2 text-sm">
                            {result.actual_result && (
                              <div>
                                <span className="font-medium">Actual Result:</span> {result.actual_result}
                              </div>
                            )}
                            {result.comments && (
                              <div>
                                <span className="font-medium">Comments:</span> {result.comments}
                              </div>
                            )}
                            {result.attachments && (result.attachments as any[]).length > 0 && (
                              <div>
                                <span className="font-medium">Attachments:</span>
                                <div className="mt-1 space-y-1">
                                  {(result.attachments as any[]).map((att: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-primary-600 hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {att.name}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}
