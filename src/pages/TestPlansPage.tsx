import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { usePermissions } from '@/hooks/usePermissions'
import Layout from '@/components/Layout'
import ManageCasesBySuite from '@/components/ManageCasesBySuite'
import TestPlanCalendar from '@/components/TestPlanCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, Edit2, X, Calendar, List as ListIcon, Link2, Check, RotateCcw, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { formatDate } from '@/lib/utils'

type TestPlan = Database['public']['Tables']['test_plans']['Row']
type TestCase = Database['public']['Tables']['test_cases']['Row']

export default function TestPlansPageNew() {
  const { currentProject } = useProjectStore()
  const { canDelete } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [linkCopied, setLinkCopied] = useState(false)

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'past'>('all')

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

  // Handle planId URL parameter
  useEffect(() => {
    const planId = searchParams.get('planId')
    if (planId && testPlans.length > 0 && !showCasesModal) {
      const plan = testPlans.find(p => p.id === planId)
      if (plan) {
        handleManageCasesFromUrl(plan)
      }
    }
  }, [searchParams, testPlans])

  const handleManageCasesFromUrl = async (plan: TestPlan) => {
    const caseIds = await fetchPlanCases(plan.id)
    setSelectedPlan(plan)
    setSelectedCaseIds(caseIds)
    setShowCasesModal(true)
  }

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
    setSearchParams({ planId: plan.id })
  }

  const closeCasesModal = () => {
    setShowCasesModal(false)
    setSelectedPlan(null)
    setSelectedCaseIds([])
    searchParams.delete('planId')
    setSearchParams(searchParams)
  }

  const copyPlanLink = async () => {
    if (!selectedPlan) return
    const url = `${window.location.origin}${window.location.pathname}?planId=${selectedPlan.id}`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
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

    closeCasesModal()
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '' })
    setShowModal(false)
    setEditingPlan(null)
  }

  // Filter test plans
  const filteredPlans = testPlans.filter(plan => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = searchQuery === '' ||
      plan.name.toLowerCase().includes(query) ||
      plan.description?.toLowerCase().includes(query)

    // Date filtering
    const today = new Date().toISOString().split('T')[0]
    let matchesDate = true
    if (dateFilter === 'upcoming') {
      matchesDate = plan.start_date ? plan.start_date > today : false
    } else if (dateFilter === 'ongoing') {
      matchesDate = plan.start_date && plan.end_date
        ? plan.start_date <= today && plan.end_date >= today
        : false
    } else if (dateFilter === 'past') {
      matchesDate = plan.end_date ? plan.end_date < today : false
    }

    return matchesSearch && matchesDate
  })

  // Count active filters
  const activeFilterCount = [
    dateFilter !== 'all',
  ].filter(Boolean).length

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('')
    setDateFilter('all')
  }

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const stats = {
    total: testPlans.length,
    upcoming: testPlans.filter(p => p.start_date && p.start_date > today).length,
    ongoing: testPlans.filter(p => p.start_date && p.end_date && p.start_date <= today && p.end_date >= today).length,
    past: testPlans.filter(p => p.end_date && p.end_date < today).length,
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
      <div className="max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-gray-50 pb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Test Plans</h1>
              <p className="text-gray-600 mt-1">{currentProject.name}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-blue-700">Upcoming: {stats.upcoming}</span>
                <span className="text-green-700">Ongoing: {stats.ongoing}</span>
                <span className="text-gray-500">Past: {stats.past}</span>
                <span className="text-gray-600">Total: {stats.total}</span>
              </div>
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

          {/* Filters - only show in list mode */}
          {viewMode === 'list' && (
            <Card className="shadow-sm">
              <CardContent className="py-4">
                {/* Main Filter Row */}
                <div className="flex flex-wrap gap-3 items-center">
                  <Input
                    placeholder="Search test plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-[200px] max-w-sm"
                  />

                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'all' | 'upcoming' | 'ongoing' | 'past')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Dates</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="past">Past</option>
                  </select>

                  {(activeFilterCount > 0 || searchQuery) && (
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </button>
                  )}
                </div>

                {/* Results Summary */}
                {(searchQuery || activeFilterCount > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Found <span className="font-medium text-gray-900">{filteredPlans.length}</span> of {testPlans.length} test plans
                    </span>
                    {activeFilterCount > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {dateFilter !== 'all' && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            Date: {dateFilter}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : viewMode === 'calendar' ? (
            <Card>
              <CardContent className="pt-6">
                <TestPlanCalendar
                  testPlans={filteredPlans}
                  onSelectPlan={(plan) => handleManageCases(plan)}
                />
              </CardContent>
            </Card>
          ) : filteredPlans.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No test plans found</h3>
                <p className="text-gray-600 mb-4">
                  {testPlans.length === 0
                    ? 'No test plans yet. Create one to get started.'
                    : 'No test plans match the selected filters'}
                </p>
                {testPlans.length === 0 && (
                  <Button onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Test Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPlans.map(plan => (
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
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </div>

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
            onClose={closeCasesModal}
            onSave={handleSaveCases}
            title={`Manage Cases - ${selectedPlan.name}`}
            onCopyLink={copyPlanLink}
            linkCopied={linkCopied}
          />
        )}
      </div>
    </Layout>
  )
}
