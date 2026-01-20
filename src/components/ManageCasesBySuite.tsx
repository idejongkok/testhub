import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { X, ChevronDown, ChevronRight, Folder, CheckSquare, Square } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type TestCase = Database['public']['Tables']['test_cases']['Row']
type TestSuite = Database['public']['Tables']['test_suites']['Row']

interface SuiteWithCases {
  suite: TestSuite | null // null for uncategorized
  cases: TestCase[]
  isExpanded: boolean
}

interface ManageCasesBySuiteProps {
  projectId: string
  selectedCaseIds: string[]
  onClose: () => void
  onSave: (caseIds: string[]) => void
}

export default function ManageCasesBySuite({
  projectId,
  selectedCaseIds,
  onClose,
  onSave
}: ManageCasesBySuiteProps) {
  const [suiteGroups, setSuiteGroups] = useState<SuiteWithCases[]>([])
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedCaseIds)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    setLoading(true)

    // Fetch suites
    const { data: suites } = await supabase
      .from('test_suites')
      .select('*')
      .eq('project_id', projectId)
      .order('name')

    // Fetch test cases
    const { data: cases } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'ready')
      .order('title')

    if (suites && cases) {
      const groups: SuiteWithCases[] = []

      // Group by suite
      suites.forEach(suite => {
        const suiteCases = cases.filter(c => c.suite_id === suite.id)
        if (suiteCases.length > 0) {
          groups.push({
            suite,
            cases: suiteCases,
            isExpanded: false
          })
        }
      })

      // Uncategorized cases
      const uncategorized = cases.filter(c => !c.suite_id)
      if (uncategorized.length > 0) {
        groups.push({
          suite: null,
          cases: uncategorized,
          isExpanded: false
        })
      }

      setSuiteGroups(groups)
    }

    setLoading(false)
  }

  const toggleSuite = (index: number) => {
    setSuiteGroups(prev =>
      prev.map((group, i) =>
        i === index ? { ...group, isExpanded: !group.isExpanded } : group
      )
    )
  }

  const toggleCase = (caseId: string) => {
    setTempSelectedIds(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    )
  }

  const toggleAllSuite = (suiteIndex: number) => {
    const group = suiteGroups[suiteIndex]
    const caseIds = group.cases.map(c => c.id)
    const allSelected = caseIds.every(id => tempSelectedIds.includes(id))

    if (allSelected) {
      // Deselect all
      setTempSelectedIds(prev => prev.filter(id => !caseIds.includes(id)))
    } else {
      // Select all
      setTempSelectedIds(prev => [...new Set([...prev, ...caseIds])])
    }
  }

  const handleSave = () => {
    onSave(tempSelectedIds)
  }

  const getSuiteSelectedCount = (group: SuiteWithCases) => {
    return group.cases.filter(c => tempSelectedIds.includes(c.id)).length
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Manage Test Cases</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Selected: {tempSelectedIds.length} test case(s)
          </p>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : suiteGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No test cases available
            </div>
          ) : (
            <div className="space-y-2">
              {suiteGroups.map((group, index) => {
                const selectedCount = getSuiteSelectedCount(group)
                const allSelected = selectedCount === group.cases.length
                const someSelected = selectedCount > 0 && !allSelected

                return (
                  <div key={group.suite?.id || 'uncategorized'} className="border border-gray-200 rounded-lg">
                    {/* Suite Header */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <button
                        onClick={() => toggleSuite(index)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {group.isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => toggleAllSuite(index)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-5 h-5 text-primary-600" />
                        ) : someSelected ? (
                          <Square className="w-5 h-5 text-primary-400 fill-primary-100" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      <Folder className="w-4 h-4 text-blue-500" />

                      <span className="flex-1 font-medium text-gray-900">
                        {group.suite?.name || 'Uncategorized'}
                      </span>

                      <span className="text-sm text-gray-600">
                        {selectedCount}/{group.cases.length}
                      </span>
                    </div>

                    {/* Cases List */}
                    {group.isExpanded && (
                      <div className="p-2 space-y-1">
                        {group.cases.map(testCase => (
                          <div
                            key={testCase.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            onClick={() => toggleCase(testCase.id)}
                          >
                            {tempSelectedIds.includes(testCase.id) ? (
                              <CheckSquare className="w-5 h-5 text-primary-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            )}

                            <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                              testCase.test_type === 'api'
                                ? 'bg-purple-100 text-purple-700'
                                : testCase.test_type === 'functional_mobile'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {testCase.test_type === 'api' ? 'API' :
                               testCase.test_type === 'functional_mobile' ? 'Mobile' : 'Web'}
                            </span>

                            <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                              testCase.priority === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : testCase.priority === 'high'
                                ? 'bg-orange-100 text-orange-700'
                                : testCase.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {testCase.priority}
                            </span>

                            <span className="flex-1 text-sm text-gray-700">
                              {testCase.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
        <div className="border-t p-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save ({tempSelectedIds.length} selected)
          </Button>
        </div>
      </Card>
    </div>
  )
}
