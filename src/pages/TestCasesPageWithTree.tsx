import { useEffect, useState, useMemo, useCallback } from 'react'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import TestCaseTree from '@/components/TestCaseTree'
import ImportTestCasesModal from '@/components/ImportTestCasesModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, FolderPlus, Search, X, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database, TestType, Priority, Status } from '@/types/database'

type TestCase = Database['public']['Tables']['test_cases']['Row']
type TestSuite = Database['public']['Tables']['test_suites']['Row']

interface TreeNodeData {
  suite: TestSuite
  children: TreeNodeData[]
  testCases: TestCase[]
  isExpanded: boolean
}

export default function TestCasesPageWithTree() {
  const { currentProject } = useProjectStore()
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [treeData, setTreeData] = useState<TreeNodeData[]>([])
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  
  // Selected items
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null)
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null)
  
  // Modals
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showSuiteModal, setShowSuiteModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null)
  const [parentSuiteForNew, setParentSuiteForNew] = useState<string | null>(null)
  const [suiteForNewCase, setSuiteForNewCase] = useState<string | null>(null)

  // Suite form
  const [suiteForm, setSuiteForm] = useState({ name: '', description: '', parent_id: null as string | null })

  // Test case form (simplified - reuse dari form lama)
  const [caseForm, setCaseForm] = useState({
    title: '',
    description: '',
    test_type: 'functional_web' as TestType,
    priority: 'medium' as Priority,
    status: 'ready' as Status,
    suite_id: null as string | null,
    preconditions: '',
    steps: [] as any[],
    expected_result: '',
    tags: '',
    // API fields
    api_method: 'GET',
    api_endpoint: '',
    api_headers: '',
    api_body: '',
    api_expected_status: 200,
    api_expected_response: '',
    // Mobile fields
    mobile_platform: 'Both',
    mobile_device: '',
  })

  // Fetch data function with useCallback
  const fetchData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)

    // Fetch suites
    const { data: suitesData } = await supabase
      .from('test_suites')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('position')

    // Fetch test cases
    const { data: casesData } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('position')

    if (suitesData) setTestSuites(suitesData)
    if (casesData) setTestCases(casesData)

    setLoading(false)
  }, [currentProject])

  useEffect(() => {
    if (currentProject) {
      fetchData()
    }
  }, [currentProject, fetchData])

  // Build tree with useMemo for optimization
  const buildTree = useCallback((suites: TestSuite[], cases: TestCase[], expandedSet: Set<string>): TreeNodeData[] => {
    const suiteMap = new Map<string, TreeNodeData>()

    // Create nodes for all suites
    suites.forEach(suite => {
      suiteMap.set(suite.id, {
        suite,
        children: [],
        testCases: [],
        isExpanded: expandedSet.has(suite.id)
      })
    })

    // Build hierarchy
    const rootNodes: TreeNodeData[] = []
    suites.forEach(suite => {
      const node = suiteMap.get(suite.id)!
      if (suite.parent_id && suiteMap.has(suite.parent_id)) {
        suiteMap.get(suite.parent_id)!.children.push(node)
      } else {
        rootNodes.push(node)
      }
    })

    // Attach test cases
    cases.forEach(testCase => {
      if (testCase.suite_id && suiteMap.has(testCase.suite_id)) {
        suiteMap.get(testCase.suite_id)!.testCases.push(testCase)
      }
    })

    // Add root node for uncategorized
    const uncategorizedCases = cases.filter(c => !c.suite_id)
    if (uncategorizedCases.length > 0 || rootNodes.length === 0) {
      rootNodes.push({
        suite: { id: 'root', name: 'Root', parent_id: null, project_id: currentProject!.id, position: -1 } as any,
        children: [],
        testCases: uncategorizedCases,
        isExpanded: true
      })
    }

    return rootNodes
  }, [currentProject])

  // Memoize tree data to prevent unnecessary rebuilds
  const treeDataMemoized = useMemo(() => {
    return buildTree(testSuites, testCases, expandedSuites)
  }, [testSuites, testCases, expandedSuites, buildTree])

  // Update treeData when memoized version changes
  useEffect(() => {
    setTreeData(treeDataMemoized)
  }, [treeDataMemoized])

  // Optimized toggle expand with useCallback
  const handleToggleExpand = useCallback((suiteId: string) => {
    setExpandedSuites(prevExpanded => {
      const newExpanded = new Set(prevExpanded)
      if (newExpanded.has(suiteId)) {
        newExpanded.delete(suiteId)
      } else {
        newExpanded.add(suiteId)
      }
      return newExpanded
    })
  }, [])

  // Suite operations
  const handleCreateSuite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject) return

    const { error } = await supabase
      .from('test_suites')
      .insert([{
        project_id: currentProject.id,
        name: suiteForm.name,
        description: suiteForm.description,
        parent_id: suiteForm.parent_id
      }])

    if (!error) {
      fetchData()
      resetSuiteForm()
    }
  }

  const handleUpdateSuite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSuite) return

    const { error } = await supabase
      .from('test_suites')
      .update({
        name: suiteForm.name,
        description: suiteForm.description,
        parent_id: suiteForm.parent_id
      })
      .eq('id', editingSuite.id)

    if (!error) {
      fetchData()
      resetSuiteForm()
    }
  }

  const handleDeleteSuite = async (suiteId: string) => {
    // Move test cases to uncategorized
    await supabase
      .from('test_cases')
      .update({ suite_id: null })
      .eq('suite_id', suiteId)

    await supabase
      .from('test_suites')
      .delete()
      .eq('id', suiteId)

    fetchData()
  }

  const resetSuiteForm = () => {
    setSuiteForm({ name: '', description: '', parent_id: null })
    setShowSuiteModal(false)
    setEditingSuite(null)
    setParentSuiteForNew(null)
  }

  // Test case operations (simplified)
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject) return

    const payload: any = {
      project_id: currentProject.id,
      title: caseForm.title,
      description: caseForm.description,
      test_type: caseForm.test_type,
      priority: caseForm.priority,
      status: caseForm.status,
      suite_id: caseForm.suite_id,
      preconditions: caseForm.preconditions,
      steps: caseForm.steps.length > 0 ? caseForm.steps : null,
      expected_result: caseForm.expected_result,
      tags: caseForm.tags ? caseForm.tags.split(',').map(t => t.trim()) : null,
    }

    // Add type-specific fields
    if (caseForm.test_type === 'api') {
      payload.api_method = caseForm.api_method
      payload.api_endpoint = caseForm.api_endpoint
      payload.api_headers = caseForm.api_headers ? JSON.parse(caseForm.api_headers) : null
      payload.api_body = caseForm.api_body ? JSON.parse(caseForm.api_body) : null
      payload.api_expected_status = caseForm.api_expected_status
      payload.api_expected_response = caseForm.api_expected_response ? JSON.parse(caseForm.api_expected_response) : null
    }

    if (caseForm.test_type === 'functional_mobile') {
      payload.mobile_platform = caseForm.mobile_platform
      payload.mobile_device = caseForm.mobile_device
    }

    const { error } = await supabase
      .from('test_cases')
      .insert([payload])

    if (!error) {
      fetchData()
      resetCaseForm()
    }
  }

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCase) return

    const payload: any = {
      title: caseForm.title,
      description: caseForm.description,
      test_type: caseForm.test_type,
      priority: caseForm.priority,
      status: caseForm.status,
      suite_id: caseForm.suite_id,
      preconditions: caseForm.preconditions,
      steps: caseForm.steps.length > 0 ? caseForm.steps : null,
      expected_result: caseForm.expected_result,
      tags: caseForm.tags ? caseForm.tags.split(',').map(t => t.trim()) : null,
    }

    if (caseForm.test_type === 'api') {
      payload.api_method = caseForm.api_method
      payload.api_endpoint = caseForm.api_endpoint
      payload.api_headers = caseForm.api_headers ? JSON.parse(caseForm.api_headers) : null
      payload.api_body = caseForm.api_body ? JSON.parse(caseForm.api_body) : null
      payload.api_expected_status = caseForm.api_expected_status
      payload.api_expected_response = caseForm.api_expected_response ? JSON.parse(caseForm.api_expected_response) : null
    }

    if (caseForm.test_type === 'functional_mobile') {
      payload.mobile_platform = caseForm.mobile_platform
      payload.mobile_device = caseForm.mobile_device
    }

    const { error } = await supabase
      .from('test_cases')
      .update(payload)
      .eq('id', editingCase.id)

    if (!error) {
      fetchData()
      resetCaseForm()
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    await supabase
      .from('test_cases')
      .delete()
      .eq('id', caseId)
    
    fetchData()
    if (selectedCase?.id === caseId) {
      setSelectedCase(null)
    }
  }

  const resetCaseForm = () => {
    setCaseForm({
      title: '',
      description: '',
      test_type: 'functional_web',
      priority: 'medium',
      status: 'ready',
      suite_id: null,
      preconditions: '',
      steps: [],
      expected_result: '',
      tags: '',
      api_method: 'GET',
      api_endpoint: '',
      api_headers: '',
      api_body: '',
      api_expected_status: 200,
      api_expected_response: '',
      mobile_platform: 'Both',
      mobile_device: '',
    })
    setShowCaseModal(false)
    setEditingCase(null)
    setSuiteForNewCase(null)
  }

  const addStep = () => {
    setCaseForm({
      ...caseForm,
      steps: [
        ...caseForm.steps,
        { step_number: caseForm.steps.length + 1, action: '', expected_result: '' }
      ]
    })
  }

  const updateStep = (index: number, field: string, value: string) => {
    const newSteps = [...caseForm.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setCaseForm({ ...caseForm, steps: newSteps })
  }

  const removeStep = (index: number) => {
    setCaseForm({
      ...caseForm,
      steps: caseForm.steps.filter((_, i) => i !== index)
    })
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
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Test Cases</h1>
            <p className="text-gray-600 mt-1">{currentProject.name}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => {
              setSuiteForm({ name: '', description: '', parent_id: null })
              setShowSuiteModal(true)
            }}>
              <FolderPlus className="w-4 h-4 mr-2" />
              New Suite
            </Button>
            <Button onClick={() => {
              resetCaseForm()
              setShowCaseModal(true)
            }}>
              <Plus className="w-4 h-4 mr-2" />
              New Test Case
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left: Tree Sidebar */}
          <div className="col-span-4 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search test cases..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <TestCaseTree
                treeData={treeData}
                onToggleExpand={handleToggleExpand}
                onSelectCase={(tc) => {
                  setSelectedCase(tc)
                  setSelectedSuite(null)
                }}
                onSelectSuite={(suite) => {
                  setSelectedSuite(suite)
                  setSelectedCase(null)
                }}
                onDeleteCase={handleDeleteCase}
                onDeleteSuite={handleDeleteSuite}
                onEditCase={(tc) => {
                  setEditingCase(tc)
                  setCaseForm({
                    title: tc.title,
                    description: tc.description || '',
                    test_type: tc.test_type,
                    priority: tc.priority,
                    status: tc.status,
                    suite_id: tc.suite_id,
                    preconditions: tc.preconditions || '',
                    steps: Array.isArray(tc.steps) ? tc.steps : [],
                    expected_result: tc.expected_result || '',
                    tags: tc.tags ? tc.tags.join(', ') : '',
                    api_method: tc.api_method || 'GET',
                    api_endpoint: tc.api_endpoint || '',
                    api_headers: tc.api_headers ? JSON.stringify(tc.api_headers, null, 2) : '',
                    api_body: tc.api_body ? JSON.stringify(tc.api_body, null, 2) : '',
                    api_expected_status: tc.api_expected_status || 200,
                    api_expected_response: tc.api_expected_response ? JSON.stringify(tc.api_expected_response, null, 2) : '',
                    mobile_platform: tc.mobile_platform || 'Both',
                    mobile_device: tc.mobile_device || '',
                  })
                  setShowCaseModal(true)
                }}
                onEditSuite={(suite) => {
                  setEditingSuite(suite)
                  setSuiteForm({
                    name: suite.name,
                    description: suite.description || '',
                    parent_id: suite.parent_id
                  })
                  setShowSuiteModal(true)
                }}
                onAddCaseToSuite={(suiteId) => {
                  resetCaseForm()
                  setCaseForm(prev => ({ ...prev, suite_id: suiteId }))
                  setShowCaseModal(true)
                }}
                onAddSubSuite={(parentId) => {
                  setSuiteForm({ name: '', description: '', parent_id: parentId })
                  setParentSuiteForNew(parentId)
                  setShowSuiteModal(true)
                }}
                selectedId={selectedCase?.id || selectedSuite?.id}
              />
            )}
          </div>

          {/* Right: Detail Panel */}
          <div className="col-span-8 bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto">
            {selectedCase ? (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                        {selectedCase.test_case_code}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCase.title}</h2>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        selectedCase.test_type === 'api' ? 'bg-purple-100 text-purple-700' :
                        selectedCase.test_type === 'functional_mobile' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {selectedCase.test_type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        selectedCase.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        selectedCase.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        selectedCase.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedCase.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        selectedCase.status === 'ready' ? 'bg-green-100 text-green-700' :
                        selectedCase.status === 'deprecated' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedCase.status}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCase(selectedCase)
                      setCaseForm({
                        title: selectedCase.title,
                        description: selectedCase.description || '',
                        test_type: selectedCase.test_type,
                        priority: selectedCase.priority,
                        status: selectedCase.status,
                        suite_id: selectedCase.suite_id,
                        preconditions: selectedCase.preconditions || '',
                        steps: Array.isArray(selectedCase.steps) ? selectedCase.steps : [],
                        expected_result: selectedCase.expected_result || '',
                        tags: selectedCase.tags ? selectedCase.tags.join(', ') : '',
                        api_method: selectedCase.api_method || 'GET',
                        api_endpoint: selectedCase.api_endpoint || '',
                        api_headers: selectedCase.api_headers ? JSON.stringify(selectedCase.api_headers, null, 2) : '',
                        api_body: selectedCase.api_body ? JSON.stringify(selectedCase.api_body, null, 2) : '',
                        api_expected_status: selectedCase.api_expected_status || 200,
                        api_expected_response: selectedCase.api_expected_response ? JSON.stringify(selectedCase.api_expected_response, null, 2) : '',
                        mobile_platform: selectedCase.mobile_platform || 'Both',
                        mobile_device: selectedCase.mobile_device || '',
                      })
                      setShowCaseModal(true)
                    }}
                  >
                    Edit
                  </Button>
                </div>

                <div className="space-y-6">
                  {selectedCase.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                      <p className="text-gray-600">{selectedCase.description}</p>
                    </div>
                  )}

                  {selectedCase.preconditions && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Preconditions</h3>
                      <p className="text-gray-600">{selectedCase.preconditions}</p>
                    </div>
                  )}

                  {selectedCase.steps && Array.isArray(selectedCase.steps) && selectedCase.steps.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Test Steps</h3>
                      <div className="space-y-3">
                        {selectedCase.steps.map((step: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium text-sm text-gray-900 mb-1">Step {idx + 1}: {step.action}</div>
                            <div className="text-sm text-gray-600">Expected: {step.expected_result}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCase.expected_result && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Expected Result</h3>
                      <p className="text-gray-600">{selectedCase.expected_result}</p>
                    </div>
                  )}

                  {selectedCase.test_type === 'api' && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">API Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Method:</span> {selectedCase.api_method}</div>
                        <div><span className="font-medium">Endpoint:</span> {selectedCase.api_endpoint}</div>
                        <div><span className="font-medium">Expected Status:</span> {selectedCase.api_expected_status}</div>
                      </div>
                    </div>
                  )}

                  {selectedCase.test_type === 'functional_mobile' && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Mobile Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Platform:</span> {selectedCase.mobile_platform}</div>
                        {selectedCase.mobile_device && (
                          <div><span className="font-medium">Device:</span> {selectedCase.mobile_device}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedCase.tags && selectedCase.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                      <div className="flex gap-2">
                        {selectedCase.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedSuite ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedSuite.name}</h2>
                {selectedSuite.description && (
                  <p className="text-gray-600">{selectedSuite.description}</p>
                )}
                <div className="mt-6">
                  <p className="text-sm text-gray-500">Select a test case to view details</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-500">Select a test case or suite from the tree</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suite Modal - Simplified */}
        {showSuiteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingSuite ? 'Edit Suite' : 'Create New Suite'}</CardTitle>
                  <button onClick={resetSuiteForm} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingSuite ? handleUpdateSuite : handleCreateSuite} className="space-y-4">
                  <Input
                    label="Suite Name"
                    value={suiteForm.name}
                    onChange={(e) => setSuiteForm({ ...suiteForm, name: e.target.value })}
                    placeholder="e.g., Payment Tests"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={suiteForm.description}
                      onChange={(e) => setSuiteForm({ ...suiteForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  {parentSuiteForNew && (
                    <p className="text-sm text-gray-600">
                      Creating sub-suite under: <strong>{testSuites.find(s => s.id === parentSuiteForNew)?.name}</strong>
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={resetSuiteForm}>Cancel</Button>
                    <Button type="submit">{editingSuite ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Case Modal - Reuse form structure from old page, simplified version for now */}
        {showCaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
            <Card className="w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingCase ? 'Edit Test Case' : 'Create New Test Case'}</CardTitle>
                  <button onClick={resetCaseForm} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingCase ? handleUpdateCase : handleCreateCase} className="space-y-4">
                  <Input
                    label="Title"
                    value={caseForm.title}
                    onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
                    required
                  />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={caseForm.test_type}
                        onChange={(e) => setCaseForm({ ...caseForm, test_type: e.target.value as TestType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="functional_web">Web</option>
                        <option value="functional_mobile">Mobile</option>
                        <option value="api">API</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={caseForm.priority}
                        onChange={(e) => setCaseForm({ ...caseForm, priority: e.target.value as Priority })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={caseForm.status}
                        onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value as Status })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="draft">Draft</option>
                        <option value="ready">Ready</option>
                        <option value="deprecated">Deprecated</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Suite</label>
                    <select
                      value={caseForm.suite_id || ''}
                      onChange={(e) => setCaseForm({ ...caseForm, suite_id: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Uncategorized</option>
                      {testSuites.map(suite => (
                        <option key={suite.id} value={suite.id}>{suite.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={caseForm.description}
                      onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>

                  {/* Simplified version - only show for web/mobile */}
                  {(caseForm.test_type === 'functional_web' || caseForm.test_type === 'functional_mobile') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preconditions</label>
                        <textarea
                          value={caseForm.preconditions}
                          onChange={(e) => setCaseForm({ ...caseForm, preconditions: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Test Steps</label>
                        <div className="space-y-3">
                          {caseForm.steps.map((step, index) => (
                            <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium">Step {index + 1}</span>
                                <button type="button" onClick={() => removeStep(index)} className="text-red-600">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <input
                                value={step.action}
                                onChange={(e) => updateStep(index, 'action', e.target.value)}
                                placeholder="Action..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
                              />
                              <input
                                value={step.expected_result}
                                onChange={(e) => updateStep(index, 'expected_result', e.target.value)}
                                placeholder="Expected result..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          ))}
                          <Button type="button" size="sm" onClick={addStep} variant="secondary" className="w-full">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Step
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* API fields - simplified */}
                  {caseForm.test_type === 'api' && (
                    <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                      <h3 className="font-medium">API Details</h3>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-1">
                          <select
                            value={caseForm.api_method}
                            onChange={(e) => setCaseForm({ ...caseForm, api_method: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input
                            value={caseForm.api_endpoint}
                            onChange={(e) => setCaseForm({ ...caseForm, api_endpoint: e.target.value })}
                            placeholder="/api/endpoint"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Input
                    label="Tags (comma separated)"
                    value={caseForm.tags}
                    onChange={(e) => setCaseForm({ ...caseForm, tags: e.target.value })}
                    placeholder="smoke, regression"
                  />

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={resetCaseForm}>Cancel</Button>
                    <Button type="submit">{editingCase ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportTestCasesModal
          projectId={currentProject.id}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchData()
            setShowImportModal(false)
          }}
        />
      )}
    </Layout>
  )
}
