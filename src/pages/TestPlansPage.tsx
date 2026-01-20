import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import ManageCasesBySuite from '@/components/ManageCasesBySuite'
import TestPlanCalendar from '@/components/TestPlanCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, Edit2, X, Calendar, List as ListIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { formatDate } from '@/lib/utils'

type TestPlan = Database['public']['Tables']['test_plans']['Row']
type TestCase = Database['public']['Tables']['test_cases']['Row']

export default function TestPlansPageNew() {
  const { currentProject } = useProjectStore()
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  
  // Modals
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

  const fetchPlanCases = async (planId: string) => {
    const { data } = await supabase
      .from('test_plan_cases')
      .select('test_case_id')
      .eq('test_plan_id', planId)

    return data ? data.map(d => d.test_case_id) : []
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

  const handleManageCases = async (plan: TestPlan) => {
    const caseIds = await fetchPlanCases(plan.id)
    setSelectedPlan(plan)
    setSelectedCaseIds(caseIds)
    setShowCasesModal(true)
  }

  const handleSaveCases = async (caseIds: string[]) => {
    if (!selectedPlan) return

    // Delete existing
    await supabase
      .from('test_plan_cases')
      .delete()
      .eq('test_plan_id', selectedPlan.id)

    // Insert new
    if (caseIds.length > 0) {
      await supabase
        .from('test_plan_cases')
        .insert(caseIds.map(caseId => ({
          test_plan_id: selectedPlan.id,
          test_case_id: caseId
        })))
    }

    setShowCasesModal(false)
    setSelectedPlan(null)
    setSelectedCaseIds([])
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '' })
    setShowModal(false)
    setEditingPlan(null)
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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Test Plans</h1>
            <p className="text-gray-600 mt-1">{currentProject.name}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'secondary'}
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'secondary'}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Test Plan
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : viewMode === 'calendar' ? (
          <Card>
            <CardContent className="pt-6">
              <TestPlanCalendar
                testPlans={testPlans}
                onSelectPlan={(plan) => handleManageCases(plan)}
              />
            </CardContent>
          </Card>
        ) : testPlans.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600">No test plans yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {testPlans.map(plan => (
              <Card key={plan.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-gray-600 mt-1">{plan.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        {plan.start_date && (
                          <span>Start: {formatDate(plan.start_date)}</span>
                        )}
                        {plan.end_date && (
                          <span>End: {formatDate(plan.end_date)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleManageCases(plan)}
                      >
                        Manage Cases
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDelete(plan.id)}
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
                  <CardTitle>{editingPlan ? 'Edit Test Plan' : 'Create New Test Plan'}</CardTitle>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Plan Name"
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
                      {editingPlan ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Manage Cases Modal */}
        {showCasesModal && selectedPlan && currentProject && (
          <ManageCasesBySuite
            projectId={currentProject.id}
            selectedCaseIds={selectedCaseIds}
            onClose={() => {
              setShowCasesModal(false)
              setSelectedPlan(null)
              setSelectedCaseIds([])
            }}
            onSave={handleSaveCases}
          />
        )}
      </div>
    </Layout>
  )
}
