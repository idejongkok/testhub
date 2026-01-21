import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Upload, Download, X, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { parseQaseCSV, generateCSVTemplate } from '@/lib/csvImport'
import { supabase } from '@/lib/supabase'

interface ImportTestCasesModalProps {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ImportTestCasesModal({ projectId, onClose, onSuccess }: ImportTestCasesModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    success: number
    errors: string[]
    suites: number
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    console.log('File selected:', selectedFile)
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setResult(null)
      console.log('File set successfully:', selectedFile.name)
    } else {
      console.log('Invalid file type:', selectedFile?.type)
      alert('Please select a valid CSV file')
    }
  }

  const handleImport = async () => {
    console.log('handleImport called, file:', file)
    if (!file) {
      console.log('No file selected, returning')
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      const { testCases, suites, errors: parseErrors } = parseQaseCSV(text)

      const importErrors: string[] = [...parseErrors]
      let successCount = 0
      let suitesCreated = 0

      // Create suites first
      const suiteIdMap = new Map<string, string>() // old_id -> new_id

      for (const suite of suites) {
        try {
          const { data, error } = await supabase
            .from('test_suites')
            .insert([{
              project_id: projectId,
              name: suite.name,
              parent_id: suite.parent_id ? suiteIdMap.get(suite.parent_id) || null : null
            }])
            .select()
            .single()

          if (!error && data) {
            suiteIdMap.set(suite.id, data.id)
            suitesCreated++
          }
        } catch (err) {
          // Suite might already exist, that's ok
          console.warn('Suite creation warning:', err)
        }
      }

      // Import test cases
      for (const testCase of testCases) {
        try {
          // Find suite_id if suite_name is provided
          let suite_id = null
          if (testCase.suite_name) {
            // Try to find existing suite
            const { data: existingSuite } = await supabase
              .from('test_suites')
              .select('id')
              .eq('project_id', projectId)
              .eq('name', testCase.suite_name)
              .single()

            suite_id = existingSuite?.id || null
          }

          const { error } = await supabase
            .from('test_cases')
            .insert([{
              project_id: projectId,
              title: testCase.title,
              description: testCase.description,
              test_type: testCase.test_type,
              priority: testCase.priority,
              status: testCase.status,
              preconditions: testCase.preconditions,
              steps: testCase.steps,
              expected_result: testCase.expected_result,
              tags: testCase.tags,
              suite_id
            }])

          if (error) {
            importErrors.push(`Failed to import "${testCase.title}": ${error.message}`)
          } else {
            successCount++
          }
        } catch (err) {
          importErrors.push(`Error importing "${testCase.title}": ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      setResult({
        success: successCount,
        errors: importErrors,
        suites: suitesCreated
      })

      if (successCount > 0) {
        onSuccess()
      }
    } catch (error) {
      setResult({
        success: 0,
        errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
        suites: 0
      })
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-cases-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Import Test Cases from CSV</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Supported Formats</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Qase.io CSV export format</li>
                <li>✅ Custom template format (download below)</li>
                <li>✅ Suites will be auto-created from CSV</li>
                <li>✅ Test steps will be parsed automatically</li>
              </ul>
            </div>

            {/* Download Template */}
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Don't have a CSV?</p>
                  <p className="text-xs text-gray-600">Download our template to get started</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5 text-primary-600" />
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload CSV file</p>
                        <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Import Button */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || importing}
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Test Cases
                  </>
                )}
              </Button>
            </div>

            {/* Results */}
            {result && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Import Results</h3>
                
                {result.success > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Successfully imported {result.success} test case{result.success !== 1 ? 's' : ''}
                        </p>
                        {result.suites > 0 && (
                          <p className="text-sm text-green-800">
                            Created {result.suites} suite{result.suites !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900 mb-2">
                          {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {result.errors.slice(0, 10).map((error, idx) => (
                            <p key={idx} className="text-xs text-red-800">
                              • {error}
                            </p>
                          ))}
                          {result.errors.length > 10 && (
                            <p className="text-xs text-red-700 italic">
                              ... and {result.errors.length - 10} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
