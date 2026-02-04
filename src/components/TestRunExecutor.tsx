import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { X, ChevronLeft, ChevronRight, Link as LinkIcon, Trash2, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database, ResultStatus } from '@/types/database'
import { useAuthStore } from '@/store/authStore'

type TestCase = Database['public']['Tables']['test_cases']['Row']
type TestRunResult = Database['public']['Tables']['test_run_results']['Row']

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

interface TestRunExecutorProps {
  testRunId: string
  testCases: TestCase[]
  existingResults: TestRunResult[]
  onClose: () => void
  onComplete: () => void
}

export default function TestRunExecutor({
  testRunId,
  testCases,
  existingResults,
  onClose,
  onComplete
}: TestRunExecutorProps) {
  const { user } = useAuthStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [executionData, setExecutionData] = useState<{ [key: string]: ExecutionState }>({})
  const [saving, setSaving] = useState(false)

  const currentCase = testCases[currentIndex]
  const currentExecution = executionData[currentCase?.id] || {
    result_status: 'untested' as ResultStatus,
    actual_result: '',
    comments: '',
    attachments: [],
    execution_time: 0
  }

  useEffect(() => {
    console.log('TestRunExecutor mounted, testRunId:', testRunId)
    // Load existing results
    const initial: { [key: string]: ExecutionState } = {}
    existingResults.forEach(result => {
      initial[result.test_case_id] = {
        result_status: result.result_status,
        actual_result: result.actual_result || '',
        comments: result.comments || '',
        attachments: (result.attachments as unknown as Attachment[]) || [],
        execution_time: result.execution_time || 0
      }
    })
    setExecutionData(initial)

    return () => {
      console.log('TestRunExecutor unmounting')
    }
  }, [existingResults])

  const updateCurrentExecution = (updates: Partial<ExecutionState>) => {
    setExecutionData(prev => ({
      ...prev,
      [currentCase.id]: {
        ...currentExecution,
        ...updates
      }
    }))
  }

  const handleStatusChange = (status: ResultStatus) => {
    updateCurrentExecution({ result_status: status })
  }

  const handleAddLink = () => {
    const url = prompt('Enter Google Drive link (or any URL):')
    if (!url) return

    const name = prompt('Enter link name (optional):') || new URL(url).hostname

    updateCurrentExecution({
      attachments: [...currentExecution.attachments, {
        type: 'link',
        url,
        name
      }]
    })
  }

  const handleRemoveAttachment = (index: number) => {
    updateCurrentExecution({
      attachments: currentExecution.attachments.filter((_, i) => i !== index)
    })
  }

  const handleSaveAndNext = async () => {
    await saveCurrentResult()
    if (currentIndex < testCases.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleSaveAndPrevious = async () => {
    await saveCurrentResult()
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleSaveAndClose = async () => {
    await saveCurrentResult()

    // Update test run status based on actual database results
    const { data: results } = await supabase
      .from('test_run_results')
      .select('result_status')
      .eq('test_run_id', testRunId)

    if (results) {
      const totalExecuted = results.filter(r => r.result_status !== 'untested').length
      const totalTests = results.length

      console.log('Test Run Status Calculation:', {
        totalTests,
        totalExecuted,
        results: results.map(r => r.result_status)
      })

      let runStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started'
      if (totalExecuted === totalTests && totalTests > 0) {
        runStatus = 'completed'
      } else if (totalExecuted > 0) {
        runStatus = 'in_progress'
      }

      console.log('Setting run status to:', runStatus)

      await supabase
        .from('test_runs')
        .update({ run_status: runStatus })
        .eq('id', testRunId)
    }

    onComplete()
  }

  const saveCurrentResult = async () => {
    if (!currentCase || !user) return

    console.log('saveCurrentResult called for test case:', currentCase.id, 'with status:', currentExecution.result_status)

    setSaving(true)
    try {
      const resultData = {
        test_run_id: testRunId,
        test_case_id: currentCase.id,
        result_status: currentExecution.result_status,
        actual_result: currentExecution.actual_result || null,
        comments: currentExecution.comments || null,
        attachments: currentExecution.attachments.length > 0 ? currentExecution.attachments : null,
        execution_time: currentExecution.execution_time || 0,
        executed_by: user.id,
        executed_at: new Date().toISOString()
      }

      // Check if result exists
      const { data: existing } = await supabase
        .from('test_run_results')
        .select('id')
        .eq('test_run_id', testRunId)
        .eq('test_case_id', currentCase.id)
        .single()

      if (existing) {
        await supabase
          .from('test_run_results')
          .update(resultData)
          .eq('id', existing.id)
      } else {
        await supabase
          .from('test_run_results')
          .insert([resultData])
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save result')
    } finally {
      setSaving(false)
    }
  }

  const getCompletionStats = () => {
    const allResults = Object.values(executionData)
    const total = testCases.length
    const executed = allResults.filter(r => r.result_status !== 'untested').length
    const passed = allResults.filter(r => r.result_status === 'passed').length
    const failed = allResults.filter(r => r.result_status === 'failed').length
    const blocked = allResults.filter(r => r.result_status === 'blocked').length
    const skipped = allResults.filter(r => r.result_status === 'skipped').length

    return { total, executed, passed, failed, blocked, skipped }
  }

  const stats = getCompletionStats()

  if (!currentCase) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>Execute Test Case</CardTitle>
                <span className="text-sm text-gray-600">
                  {currentIndex + 1} / {testCases.length}
                </span>
              </div>
              
              {/* Progress Stats */}
              <div className="flex gap-4 text-sm">
                <span className="text-green-700">
                  ✓ Passed: {stats.passed}
                </span>
                <span className="text-red-700">
                  ✗ Failed: {stats.failed}
                </span>
                <span className="text-yellow-700">
                  ⊘ Blocked: {stats.blocked}
                </span>
                <span className="text-gray-700">
                  ↷ Skipped: {stats.skipped}
                </span>
                <span className="text-gray-600">
                  Progress: {stats.executed}/{stats.total}
                </span>
              </div>
            </div>
            <button onClick={handleSaveAndClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-6">
          {/* Test Case Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">{currentCase.title}</h3>
            {currentCase.description && (
              <p className="text-sm text-gray-600 mb-3">{currentCase.description}</p>
            )}
            
            <div className="flex gap-2 text-xs">
              <span className={`px-2 py-1 rounded ${
                currentCase.test_type === 'api'
                  ? 'bg-purple-100 text-purple-700'
                  : currentCase.test_type === 'functional_mobile'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {currentCase.test_type === 'api' ? 'API' : currentCase.test_type === 'functional_mobile' ? 'Mobile' : 'Web'}
              </span>
              <span className={`px-2 py-1 rounded ${
                currentCase.priority === 'critical'
                  ? 'bg-red-100 text-red-700'
                  : currentCase.priority === 'high'
                  ? 'bg-orange-100 text-orange-700'
                  : currentCase.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {currentCase.priority}
              </span>
            </div>
          </div>

          {/* Preconditions */}
          {currentCase.preconditions && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Preconditions</h4>
              <div className="bg-blue-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">
                {currentCase.preconditions}
              </div>
            </div>
          )}

          {/* Test Steps */}
          {currentCase.steps && Array.isArray(currentCase.steps) && currentCase.steps.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Test Steps</h4>
              <div className="space-y-3">
                {currentCase.steps.map((step: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-sm">
                        {step.step_number || index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-600">Action:</span>
                          <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{step.action}</p>
                        </div>
                        {step.expected_result && (
                          <div>
                            <span className="text-xs font-medium text-gray-600">Expected Result:</span>
                            <p className="text-sm text-green-700 mt-1 whitespace-pre-wrap">{step.expected_result}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Selection */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Result Status *</h4>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleStatusChange('passed')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  currentExecution.result_status === 'passed'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <CheckCircle className={`w-6 h-6 mx-auto mb-1 ${
                  currentExecution.result_status === 'passed' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <span className="text-sm font-medium">Passed</span>
              </button>

              <button
                onClick={() => handleStatusChange('failed')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  currentExecution.result_status === 'failed'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <XCircle className={`w-6 h-6 mx-auto mb-1 ${
                  currentExecution.result_status === 'failed' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <span className="text-sm font-medium">Failed</span>
              </button>

              <button
                onClick={() => handleStatusChange('blocked')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  currentExecution.result_status === 'blocked'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-yellow-300'
                }`}
              >
                <AlertCircle className={`w-6 h-6 mx-auto mb-1 ${
                  currentExecution.result_status === 'blocked' ? 'text-yellow-600' : 'text-gray-400'
                }`} />
                <span className="text-sm font-medium">Blocked</span>
              </button>

              <button
                onClick={() => handleStatusChange('skipped')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  currentExecution.result_status === 'skipped'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Clock className={`w-6 h-6 mx-auto mb-1 ${
                  currentExecution.result_status === 'skipped' ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <span className="text-sm font-medium">Skipped</span>
              </button>
            </div>
          </div>

          {/* Actual Result */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Result
            </label>
            <textarea
              value={currentExecution.actual_result}
              onChange={(e) => updateCurrentExecution({ actual_result: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
              value={currentExecution.comments}
              onChange={(e) => updateCurrentExecution({ comments: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Google Drive, Screenshots, etc.)
            </label>
            <div className="flex gap-2 mb-3">
              <Button type="button" variant="secondary" size="sm" onClick={handleAddLink}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Add Link
              </Button>
              <span className="text-xs text-gray-500 flex items-center">
                Tip: Upload to Google Drive, then paste link here
              </span>
            </div>

            {currentExecution.attachments.length > 0 && (
              <div className="space-y-2">
                {currentExecution.attachments.map((att, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline flex items-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
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
              value={currentExecution.execution_time}
              onChange={(e) => updateCurrentExecution({ execution_time: parseInt(e.target.value) || 0 })}
              min={0}
            />
          </div>
        </CardContent>

        {/* Navigation Footer */}
        <div className="border-t p-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveAndPrevious}
              disabled={currentIndex === 0 || saving}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleSaveAndClose} disabled={saving}>
                {saving ? 'Saving...' : 'Save & Close'}
              </Button>

              {currentIndex < testCases.length - 1 ? (
                <Button size="sm" onClick={handleSaveAndNext} disabled={saving}>
                  Save & Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSaveAndClose} disabled={saving}>
                  Finish
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
