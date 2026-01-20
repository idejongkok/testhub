import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, FileCheck, Trash2, Edit2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database, TestType, Priority, Status } from '@/types/database'
import { formatDate } from '@/lib/utils'

type TestCase = Database['public']['Tables']['test_cases']['Row']

export default function TestCasesPage() {
  const { currentProject } = useProjectStore()
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<TestType | 'all'>('all')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    test_type: 'functional_web' as TestType,
    priority: 'medium' as Priority,
    status: 'ready' as Status,
    preconditions: '',
    steps: [] as any[],
    expected_result: '',
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
    tags: '',
  })

  useEffect(() => {
    if (currentProject) {
      fetchTestCases()
    }
  }, [currentProject])

  const fetchTestCases = async () => {
    if (!currentProject) return
    setLoading(true)
    const { data, error } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTestCases(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject) return

    const payload: any = {
      project_id: currentProject.id,
      title: formData.title,
      description: formData.description,
      test_type: formData.test_type,
      priority: formData.priority,
      status: formData.status,
      preconditions: formData.preconditions,
      steps: formData.steps.length > 0 ? formData.steps : null,
      expected_result: formData.expected_result,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
    }

    // Add API-specific fields
    if (formData.test_type === 'api') {
      payload.api_method = formData.api_method
      payload.api_endpoint = formData.api_endpoint
      payload.api_headers = formData.api_headers ? JSON.parse(formData.api_headers) : null
      payload.api_body = formData.api_body ? JSON.parse(formData.api_body) : null
      payload.api_expected_status = formData.api_expected_status
      payload.api_expected_response = formData.api_expected_response ? JSON.parse(formData.api_expected_response) : null
    }

    // Add Mobile-specific fields
    if (formData.test_type === 'functional_mobile') {
      payload.mobile_platform = formData.mobile_platform
      payload.mobile_device = formData.mobile_device
    }

    if (editingCase) {
      const { error } = await supabase
        .from('test_cases')
        .update(payload)
        .eq('id', editingCase.id)
      if (!error) {
        fetchTestCases()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('test_cases')
        .insert([payload])
      if (!error) {
        fetchTestCases()
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this test case?')) {
      await supabase.from('test_cases').delete().eq('id', id)
      fetchTestCases()
    }
  }

  const handleEdit = (testCase: TestCase) => {
    setEditingCase(testCase)
    setFormData({
      title: testCase.title,
      description: testCase.description || '',
      test_type: testCase.test_type,
      priority: testCase.priority,
      status: testCase.status,
      preconditions: testCase.preconditions || '',
      steps: Array.isArray(testCase.steps) ? testCase.steps : [],
      expected_result: testCase.expected_result || '',
      api_method: testCase.api_method || 'GET',
      api_endpoint: testCase.api_endpoint || '',
      api_headers: testCase.api_headers ? JSON.stringify(testCase.api_headers, null, 2) : '',
      api_body: testCase.api_body ? JSON.stringify(testCase.api_body, null, 2) : '',
      api_expected_status: testCase.api_expected_status || 200,
      api_expected_response: testCase.api_expected_response ? JSON.stringify(testCase.api_expected_response, null, 2) : '',
      mobile_platform: testCase.mobile_platform || 'Both',
      mobile_device: testCase.mobile_device || '',
      tags: testCase.tags ? testCase.tags.join(', ') : '',
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setShowModal(false)
    setEditingCase(null)
    setFormData({
      title: '',
      description: '',
      test_type: 'functional_web',
      priority: 'medium',
      status: 'draft',
      preconditions: '',
      steps: [],
      expected_result: '',
      api_method: 'GET',
      api_endpoint: '',
      api_headers: '',
      api_body: '',
      api_expected_status: 200,
      api_expected_response: '',
      mobile_platform: 'Both',
      mobile_device: '',
      tags: '',
    })
  }

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        { step_number: formData.steps.length + 1, action: '', expected_result: '' }
      ]
    })
  }

  const updateStep = (index: number, field: string, value: string) => {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setFormData({ ...formData, steps: newSteps })
  }

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index)
    })
  }

  const filteredTestCases = testCases.filter(tc => {
    const matchesSearch = tc.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || tc.test_type === filterType
    return matchesSearch && matchesType
  })

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
            <h1 className="text-3xl font-bold text-gray-900">Test Cases</h1>
            <p className="text-gray-600 mt-1">{currentProject.name}</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Test Case
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search test cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="functional_web">Web Functional</option>
                <option value="functional_mobile">Mobile Functional</option>
                <option value="api">API Testing</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : filteredTestCases.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No test cases yet</h3>
              <p className="text-gray-600 mb-4">Create your first test case</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Test Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTestCases.map((testCase) => (
              <Card key={testCase.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          testCase.test_type === 'api' ? 'bg-purple-100 text-purple-700' :
                          testCase.test_type === 'functional_mobile' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {testCase.test_type === 'api' ? 'API' :
                           testCase.test_type === 'functional_mobile' ? 'Mobile' : 'Web'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          testCase.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          testCase.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          testCase.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {testCase.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          testCase.status === 'ready' ? 'bg-green-100 text-green-700' :
                          testCase.status === 'deprecated' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {testCase.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {testCase.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {testCase.description || 'No description'}
                      </p>
                      {testCase.tags && testCase.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {testCase.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(testCase)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(testCase.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
            <Card className="w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingCase ? 'Edit Test Case' : 'Create New Test Case'}</CardTitle>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <Input
                      label="Test Case Title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Login with valid credentials"
                      required
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Test case description..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Test Type
                        </label>
                        <select
                          value={formData.test_type}
                          onChange={(e) => setFormData({ ...formData, test_type: e.target.value as TestType })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="functional_web">Web Functional</option>
                          <option value="functional_mobile">Mobile Functional</option>
                          <option value="api">API Testing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="ready">Ready</option>
                          <option value="deprecated">Deprecated</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* API Specific Fields */}
                  {formData.test_type === 'api' && (
                    <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                      <h3 className="font-medium text-gray-900">API Testing Details</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Method
                          </label>
                          <select
                            value={formData.api_method}
                            onChange={(e) => setFormData({ ...formData, api_method: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <Input
                            label="Endpoint"
                            value={formData.api_endpoint}
                            onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                            placeholder="/api/v1/users"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Headers (JSON)
                        </label>
                        <textarea
                          value={formData.api_headers}
                          onChange={(e) => setFormData({ ...formData, api_headers: e.target.value })}
                          placeholder='{"Content-Type": "application/json"}'
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Request Body (JSON)
                        </label>
                        <textarea
                          value={formData.api_body}
                          onChange={(e) => setFormData({ ...formData, api_body: e.target.value })}
                          placeholder='{"username": "test", "password": "test123"}'
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Expected Status Code"
                          type="number"
                          value={formData.api_expected_status}
                          onChange={(e) => setFormData({ ...formData, api_expected_status: parseInt(e.target.value) })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expected Response (JSON)
                        </label>
                        <textarea
                          value={formData.api_expected_response}
                          onChange={(e) => setFormData({ ...formData, api_expected_response: e.target.value })}
                          placeholder='{"success": true, "data": {...}}'
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                          rows={4}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mobile Specific Fields */}
                  {formData.test_type === 'functional_mobile' && (
                    <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                      <h3 className="font-medium text-gray-900">Mobile Testing Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Platform
                          </label>
                          <select
                            value={formData.mobile_platform}
                            onChange={(e) => setFormData({ ...formData, mobile_platform: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="Both">Both (iOS & Android)</option>
                            <option value="iOS">iOS</option>
                            <option value="Android">Android</option>
                          </select>
                        </div>
                        <Input
                          label="Device / OS Version"
                          value={formData.mobile_device}
                          onChange={(e) => setFormData({ ...formData, mobile_device: e.target.value })}
                          placeholder="iPhone 14 / iOS 17"
                        />
                      </div>
                    </div>
                  )}

                  {/* Common Fields for Web & Mobile */}
                  {(formData.test_type === 'functional_web' || formData.test_type === 'functional_mobile') && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preconditions
                        </label>
                        <textarea
                          value={formData.preconditions}
                          onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                          placeholder="User must be logged in..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Test Steps
                        </label>
                        <div className="space-y-3">
                          {formData.steps.map((step, index) => (
                            <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-gray-700">Step {index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeStep(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <input
                                value={step.action}
                                onChange={(e) => updateStep(index, 'action', e.target.value)}
                                placeholder="Action to perform..."
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Overall Expected Result
                        </label>
                        <textarea
                          value={formData.expected_result}
                          onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
                          placeholder="User successfully logged in..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          rows={2}
                        />
                      </div>
                    </div>
                  )}

                  <Input
                    label="Tags (comma separated)"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="login, authentication, smoke"
                  />

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCase ? 'Update' : 'Create'} Test Case
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}
