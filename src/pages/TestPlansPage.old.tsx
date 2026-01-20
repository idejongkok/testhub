import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, ClipboardList, Trash2, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { formatDate } from '@/lib/utils'

type TestPlan = Database['public']['Tables']['test_plans']['Row']
type TestCase = Database['public']['Tables']['test_cases']['Row']

export default function TestPlansPage() {
  const { currentProject } = useProjectStore()
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showCasesModal, setShowCasesModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<TestPlan | null>(null)
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    if (currentProject) {
      fetchTestPlans()
      fetchTestCases()
    }
  }, [currentProject])

  const fetchTestPlans = async () => {
    if (!currentProject) return
    setLoading(true)
    const { data, error } = await supabase
      .from('test_plans')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTestPlans(data)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject) return

    if (editingPlan) {
      const { error } = await supabase
        .from('test_plans')
        .update({
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        })
        .eq('id', editingPlan.id)

      if (!error) {
        fetchTestPlans()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('test_plans')
        .insert([{
          project_id: currentProject.id,
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        }])

      if (!error) {
        fetchTestPlans()
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this test plan?')) {
      await supabase.from('test_plans').delete().eq('id', id)
      fetchTestPlans()
    }
  }

  const handleEdit = (plan: TestPlan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      description: plan.description || '',
      start_date: plan.start_date || '',
      end_date: plan.end_date || '',
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setShowModal(false)
    setEditingPlan(null)
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
    })
  }

  const handleManageCases = async (plan: TestPlan) => {
    setSelectedPlan(plan)
    
    // Fetch existing test cases for this plan
    const { data } = await supabase
      .from('test_plan_cases')
      .select('test_case_id')
      .eq('test_plan_id', plan.id)
    
    if (data) {
      setSelectedCaseIds(data.map(d => d.test_case_id))
    }
    
    setShowCasesModal(true)
  }

  const handleToggleCase = (caseId: string) => {
    setSelectedCaseIds(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    )
  }

  const handleSaveCases = async () => {
    if (!selectedPlan) return

    // Delete existing associations
    await supabase
      .from('test_plan_cases')
      .delete()
      .eq('test_plan_id', selectedPlan.id)

    // Insert new associations
    if (selectedCaseIds.length > 0) {
      const inserts = selectedCaseIds.map(caseId => ({
        test_plan_id: selectedPlan.id,
        test_case_id: caseId,
      }))

      await supabase.from('test_plan_cases').insert(inserts)
    }

    setShowCasesModal(false)
    setSelectedPlan(null)
    setSelectedCaseIds([])
  }

  const getCaseCount = async (planId: string) => {
    const { count } = await supabase
      .from('test_plan_cases')
      .select('*', { count: 'exact', head: true })
      .eq('test_plan_id', planId)
    
    return count || 0
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
            <h1 className="text-3xl font-bold text-gray-900">Test Plans</h1>
            <p className="text-gray-600 mt-1">{currentProject.name}</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Test Plan
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : testPlans.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No test plans yet</h3>
              <p className="text-gray-600 mb-4">Create your first test plan</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Test Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testPlans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {plan.start_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {plan.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleManageCases(plan)}
                    >
                      Manage Cases
                    </Button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="p-1 text-gray-600 hover:text-primary-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-1 text-gray-600 hover:text-red-600"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingPlan ? 'Edit Test Plan' : 'Create New Test Plan'}</CardTitle>
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Plan Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Sprint 1 Test Plan"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Test plan description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Start Date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                    <Input
                      label="End Date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingPlan ? 'Update' : 'Create'} Test Plan
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Manage Cases Modal */}
        {showCasesModal && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
            <Card className="w-full max-w-3xl my-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Manage Test Cases - {selectedPlan.name}</CardTitle>
                  <button
                    onClick={() => {
                      setShowCasesModal(false)
                      setSelectedPlan(null)
                      setSelectedCaseIds([])
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {testCases.map((testCase) => (
                    <label
                      key={testCase.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCaseIds.includes(testCase.id)}
                        onChange={() => handleToggleCase(testCase.id)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            testCase.test_type === 'api' ? 'bg-purple-100 text-purple-700' :
                            testCase.test_type === 'functional_mobile' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {testCase.test_type === 'api' ? 'API' :
                             testCase.test_type === 'functional_mobile' ? 'Mobile' : 'Web'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            testCase.status === 'ready' ? 'bg-green-100 text-green-700' :
                            testCase.status === 'deprecated' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {testCase.status}
                          </span>
                          <span className="font-medium text-gray-900">{testCase.title}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {testCase.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-600">
                    {selectedCaseIds.length} cases selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowCasesModal(false)
                        setSelectedPlan(null)
                        setSelectedCaseIds([])
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveCases}>
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}
