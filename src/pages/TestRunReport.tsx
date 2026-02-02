import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Share2, Download, ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { formatDateTime } from '@/lib/utils'

type TestRun = Database['public']['Tables']['test_runs']['Row']
type TestRunResult = Database['public']['Tables']['test_run_results']['Row'] & {
  test_cases?: {
    id: string
    test_case_code: string
    title: string
    test_type: string
    priority: string
    steps: any
  }
  executor?: {
    email: string
    full_name: string | null
  }
}

export default function TestRunReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [testRun, setTestRun] = useState<TestRun | null>(null)
  const [results, setResults] = useState<TestRunResult[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (id) {
      fetchReport()
    }
  }, [id])

  const fetchReport = async () => {
    if (!id) return

    setLoading(true)

    // Fetch test run
    const { data: runData } = await supabase
      .from('test_runs')
      .select('*')
      .eq('id', id)
      .single()

    // Fetch results with test case details and executor info
    const { data: resultsData } = await supabase
      .from('test_run_results')
      .select(`
        *,
        test_cases (
          id,
          test_case_code,
          title,
          test_type,
          priority,
          steps
        ),
        executor:user_profiles(email, full_name)
      `)
      .eq('test_run_id', id)
      .order('position', { ascending: true })

    if (runData) setTestRun(runData)
    if (resultsData) setResults(resultsData as TestRunResult[])

    setLoading(false)
  }

  const getStats = () => {
    const total = results.length
    const passed = results.filter(r => r.result_status === 'passed').length
    const failed = results.filter(r => r.result_status === 'failed').length
    const blocked = results.filter(r => r.result_status === 'blocked').length
    const skipped = results.filter(r => r.result_status === 'skipped').length
    const notExecuted = results.filter(r => r.result_status === 'untested').length

    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0'

    return { total, passed, failed, blocked, skipped, notExecuted, passRate }
  }

  const handleShare = async () => {
    const publicUrl = `${window.location.origin}/report/test-run/${id}`
    
    try {
      await navigator.clipboard.writeText(publicUrl)
      alert('Public link copied to clipboard!')
    } catch (error) {
      prompt('Copy this link:', publicUrl)
    }
  }

  const handleDownload = () => {
    // Generate CSV report
    const headers = ['Test Case', 'Status', 'Actual Result', 'Comments', 'Execution Time (min)']
    const rows = results.map(r => [
      r.test_cases?.title || '',
      r.result_status,
      r.actual_result || '',
      r.comments || '',
      r.execution_time || 0
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-run-${testRun?.name.replace(/[^a-z0-9]/gi, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </Layout>
    )
  }

  if (!testRun) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Test run not found</p>
        </div>
      </Layout>
    )
  }

  const stats = getStats()

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/test-runs')} className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Test Runs
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{testRun.name}</h1>
            {testRun.description && (
              <p className="text-gray-600 mt-1">{testRun.description}</p>
            )}
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              <span>Environment: <span className="font-medium">{testRun.environment}</span></span>
              <span>Status: <span className={`font-medium ${
                testRun.run_status === 'completed' ? 'text-green-600' :
                testRun.run_status === 'in_progress' ? 'text-blue-600' : 'text-gray-600'
              }`}>{testRun.run_status}</span></span>
              <span>Created: {formatDateTime(testRun.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="secondary" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-7 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.blocked}</div>
              <div className="text-sm text-gray-600">Blocked</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.notExecuted}</div>
              <div className="text-sm text-gray-600">Untested</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.passRate}%</div>
              <div className="text-sm text-gray-600">Pass Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result) => {
                const isExpanded = expandedIds.has(result.id)
                const hasSteps = result.test_cases?.steps && Array.isArray(result.test_cases.steps) && result.test_cases.steps.length > 0

                return (
                  <div
                    key={result.id}
                    className={`rounded-lg border-l-4 ${
                      result.result_status === 'passed'
                        ? 'border-green-500 bg-green-50'
                        : result.result_status === 'failed'
                        ? 'border-red-500 bg-red-50'
                        : result.result_status === 'blocked'
                        ? 'border-yellow-500 bg-yellow-50'
                        : result.result_status === 'skipped'
                        ? 'border-gray-500 bg-gray-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {/* Clickable Header */}
                    <div
                      className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleExpand(result.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {result.result_status === 'passed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                            {result.result_status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                            {result.result_status === 'blocked' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                            {result.result_status === 'skipped' && <Clock className="w-5 h-5 text-gray-600" />}
                            {result.result_status === 'untested' && <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}

                            <h3 className="font-semibold text-gray-900">
                              {result.test_cases?.title}
                            </h3>

                            <span className={`px-2 py-0.5 text-xs rounded ${
                              result.test_cases?.test_type === 'api'
                                ? 'bg-purple-100 text-purple-700'
                                : result.test_cases?.test_type === 'functional_mobile'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {result.test_cases?.test_type === 'api' ? 'API' : result.test_cases?.test_type === 'functional_mobile' ? 'Mobile' : 'Web'}
                            </span>

                            <span className={`px-2 py-0.5 text-xs rounded ${
                              result.test_cases?.priority === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : result.test_cases?.priority === 'high'
                                ? 'bg-orange-100 text-orange-700'
                                : result.test_cases?.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {result.test_cases?.priority}
                            </span>

                            {hasSteps && (
                              <span className="text-xs text-gray-500">
                                ({(result.test_cases?.steps as any[]).length} steps)
                              </span>
                            )}
                          </div>

                          {result.actual_result && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-600">Actual Result:</span>
                              <p className="text-sm text-gray-700 mt-1">{result.actual_result}</p>
                            </div>
                          )}

                          {result.comments && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-600">Comments:</span>
                              <p className="text-sm text-gray-700 mt-1">{result.comments}</p>
                            </div>
                          )}

                          {result.attachments && Array.isArray(result.attachments) && result.attachments.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-600">Attachments:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {result.attachments.map((att: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {att.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="text-right text-sm text-gray-600">
                            {result.execution_time && result.execution_time > 0 && (
                              <div className="mb-1">
                                {result.execution_time} min
                              </div>
                            )}
                            {result.executor && (
                              <div className="text-xs text-gray-500">
                                By: {result.executor.full_name || result.executor.email}
                              </div>
                            )}
                          </div>

                          {hasSteps && (
                            <div className="text-gray-400">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Steps */}
                    {isExpanded && hasSteps && (
                      <div className="px-4 pb-4 border-t border-gray-200 mt-2 pt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Test Steps:</h4>
                        <div className="space-y-2">
                          {(result.test_cases?.steps as Array<{ step_number: number; action: string; expected_result: string }>).map((step, index) => (
                            <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium">
                                  {step.step_number || index + 1}
                                </span>
                                <div className="flex-1 space-y-1">
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Action:</span>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{step.action}</p>
                                  </div>
                                  {step.expected_result && (
                                    <div>
                                      <span className="text-xs font-medium text-gray-500">Expected:</span>
                                      <p className="text-sm text-green-700 whitespace-pre-wrap">{step.expected_result}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {results.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No test results yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
