import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
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
  }
}

export default function TestRunReportPublic() {
  const { id } = useParams<{ id: string }>()
  const [testRun, setTestRun] = useState<TestRun | null>(null)
  const [results, setResults] = useState<TestRunResult[]>([])
  const [loading, setLoading] = useState(true)

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

    // Fetch results with test case details
    const { data: resultsData } = await supabase
      .from('test_run_results')
      .select(`
        *,
        test_cases (
          id,
          test_case_code,
          title,
          test_type,
          priority
        )
      `)
      .eq('test_run_id', id)

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
    const notExecuted = results.filter(r => r.result_status === 'not_executed').length

    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0'

    return { total, passed, failed, blocked, skipped, notExecuted, passRate }
  }

  const handleDownload = () => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!testRun) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Test run not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = getStats()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{testRun.name}</h1>
              {testRun.description && (
                <p className="text-gray-600 mt-2">{testRun.description}</p>
              )}
              <div className="flex gap-4 mt-3 text-sm text-gray-600">
                <span>Environment: <span className="font-medium">{testRun.environment}</span></span>
                <span>Status: <span className={`font-medium ${
                  testRun.status === 'completed' ? 'text-green-600' :
                  testRun.status === 'in_progress' ? 'text-blue-600' : 'text-gray-600'
                }`}>{testRun.status}</span></span>
                <span>Created: {formatDateTime(testRun.created_at)}</span>
              </div>
            </div>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mb-6">
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
              <div className="text-2xl font-bold text-primary-600">{stats.passRate}%</div>
              <div className="text-sm text-gray-600">Pass Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`p-4 rounded-lg border-l-4 ${
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {result.result_status === 'passed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {result.result_status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                        {result.result_status === 'blocked' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                        {result.result_status === 'skipped' && <Clock className="w-5 h-5 text-gray-600" />}
                        
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
                          {result.test_cases?.test_type}
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
                              >
                                {att.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      {result.execution_time > 0 && (
                        <span className="text-sm text-gray-600">
                          {result.execution_time} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {results.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No test results yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Generated by TestHub - Quality Assurance Platform</p>
        </div>
      </div>
    </div>
  )
}
