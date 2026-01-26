import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, X, Edit2, Trash2, Bug, ExternalLink, User, Eye, MessageSquare, Send } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Database, BugStatus, BugSeverity } from '@/types/database'
import { formatDateTime } from '@/lib/utils'

type BugRow = Database['public']['Tables']['bugs']['Row'] & {
  test_case?: { title: string }
  test_run?: { name: string }
  reporter?: { email: string; full_name: string | null }
  assignee?: { email: string; full_name: string | null }
}

type UserProfile = {
  id: string
  email: string
  full_name: string | null
}

type BugComment = {
  id: string
  bug_id: string
  user_id: string
  content: string
  created_at: string
  user: { email: string; full_name: string | null }
}

export default function BugsPage() {
  const { currentProject } = useProjectStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const [bugs, setBugs] = useState<BugRow[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [viewingBug, setViewingBug] = useState<BugRow | null>(null)
  const [editingBug, setEditingBug] = useState<BugRow | null>(null)
  const [statusFilter, setStatusFilter] = useState<BugStatus | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<BugSeverity | 'all'>('all')
  const [prefillData, setPrefillData] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [comments, setComments] = useState<BugComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as BugSeverity,
    status: 'open' as BugStatus,
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    environment: '',
    browser: '',
    device: '',
    os: '',
    external_link: '',
    tags: '',
    test_run_id: '',
    test_case_id: '',
    test_run_result_id: '',
    assigned_to: '',
  })

  useEffect(() => {
    if (currentProject) {
      fetchBugs()
      fetchAllUsers()
    }
  }, [currentProject])

  useEffect(() => {
    if (viewingBug) {
      fetchComments(viewingBug.id)
    } else {
      setComments([])
    }
  }, [viewingBug])

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .order('full_name')
    if (data) {
      setAllUsers(data as UserProfile[])
    }
  }

  const fetchComments = async (bugId: string) => {
    setLoadingComments(true)
    const { data } = await supabase
      .from('bug_comments')
      .select('*, user:user_profiles(email, full_name)')
      .eq('bug_id', bugId)
      .order('created_at', { ascending: true })
    if (data) {
      setComments(data as BugComment[])
    }
    setLoadingComments(false)
  }

  const handleAddComment = async () => {
    if (!viewingBug || !newComment.trim() || !user) return

    const { error } = await (supabase.from('bug_comments') as any).insert({
      bug_id: viewingBug.id,
      user_id: user.id,
      content: newComment.trim()
    })

    if (!error) {
      setNewComment('')
      fetchComments(viewingBug.id)
    }
  }

  // Handle prefilled data from navigation state
  useEffect(() => {
    const state = location.state as { prefillData?: any }
    if (state?.prefillData) {
      setPrefillData(state.prefillData)
      setFormData(prev => ({
        ...prev,
        title: state.prefillData.title || '',
        severity: state.prefillData.severity || 'medium',
        environment: state.prefillData.environment || '',
        test_run_id: state.prefillData.test_run_id || '',
        test_case_id: state.prefillData.test_case_id || '',
        test_run_result_id: state.prefillData.test_run_result_id || '',
      }))
      setShowModal(true)
      // Clear the navigation state
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const fetchBugs = async () => {
    if (!currentProject) return
    setLoading(true)

    const { data, error } = await supabase
      .from('bugs')
      .select(`
        *,
        test_case:test_cases(title),
        test_run:test_runs(name),
        reporter:user_profiles!bugs_reported_by_fkey(email, full_name),
        assignee:user_profiles!bugs_assigned_to_fkey(email, full_name)
      `)
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setBugs(data as BugRow[])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject) return

    const payload: any = {
      project_id: currentProject.id,
      title: formData.title,
      description: formData.description || null,
      severity: formData.severity,
      status: formData.status,
      steps_to_reproduce: formData.steps_to_reproduce || null,
      expected_behavior: formData.expected_behavior || null,
      actual_behavior: formData.actual_behavior || null,
      environment: formData.environment || null,
      browser: formData.browser || null,
      device: formData.device || null,
      os: formData.os || null,
      external_link: formData.external_link || null,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
      test_run_id: formData.test_run_id || null,
      test_case_id: formData.test_case_id || null,
      test_run_result_id: formData.test_run_result_id || null,
      assigned_to: formData.assigned_to || null,
    }

    // Auto-set reporter when creating new bug
    if (!editingBug && user) {
      payload.reported_by = user.id
    }

    if (editingBug) {
      const { error } = await (supabase
        .from('bugs') as any)
        .update(payload)
        .eq('id', editingBug.id)

      if (!error) {
        fetchBugs()
        resetForm()
      }
    } else {
      const { error } = await (supabase
        .from('bugs') as any)
        .insert(payload)

      if (!error) {
        fetchBugs()
        resetForm()
      }
    }
  }

  const handleEdit = (bug: BugRow) => {
    setEditingBug(bug)
    setFormData({
      title: bug.title,
      description: bug.description || '',
      severity: bug.severity,
      status: bug.status,
      steps_to_reproduce: bug.steps_to_reproduce || '',
      expected_behavior: bug.expected_behavior || '',
      actual_behavior: bug.actual_behavior || '',
      environment: bug.environment || '',
      browser: bug.browser || '',
      device: bug.device || '',
      os: bug.os || '',
      external_link: bug.external_link || '',
      tags: bug.tags ? bug.tags.join(', ') : '',
      assigned_to: bug.assigned_to || '',
      test_run_id: bug.test_run_id || '',
      test_case_id: bug.test_case_id || '',
      test_run_result_id: bug.test_run_result_id || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this bug?')) {
      await supabase.from('bugs').delete().eq('id', id)
      fetchBugs()
    }
  }

  const resetForm = () => {
    setShowModal(false)
    setEditingBug(null)
    setPrefillData(null)
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      status: 'open',
      steps_to_reproduce: '',
      expected_behavior: '',
      actual_behavior: '',
      environment: '',
      browser: '',
      device: '',
      os: '',
      external_link: '',
      tags: '',
      test_run_id: '',
      test_case_id: '',
      test_run_result_id: '',
      assigned_to: '',
    })
  }

  const getSeverityColor = (severity: BugSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: BugStatus) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      case 'wont_fix':
        return 'bg-purple-100 text-purple-800'
    }
  }

  const filteredBugs = bugs.filter(bug => {
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter
    const matchesSeverity = severityFilter === 'all' || bug.severity === severityFilter
    return matchesStatus && matchesSeverity
  })

  const stats = {
    total: bugs.length,
    open: bugs.filter(b => b.status === 'open').length,
    inProgress: bugs.filter(b => b.status === 'in_progress').length,
    resolved: bugs.filter(b => b.status === 'resolved').length,
    critical: bugs.filter(b => b.severity === 'critical').length,
    high: bugs.filter(b => b.severity === 'high').length,
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bugs & Issues</h1>
            <p className="text-gray-600 mt-1">{currentProject.name}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-red-700">Open: {stats.open}</span>
              <span className="text-blue-700">In Progress: {stats.inProgress}</span>
              <span className="text-green-700">Resolved: {stats.resolved}</span>
              <span className="text-gray-600">Total: {stats.total}</span>
            </div>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Report Bug
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BugStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="wont_fix">Won't Fix</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as BugSeverity | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Bugs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : filteredBugs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bug className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bugs found</h3>
              <p className="text-gray-600 mb-4">
                {bugs.length === 0
                  ? 'No bugs reported yet'
                  : 'No bugs match the selected filters'}
              </p>
              {bugs.length === 0 && (
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Report First Bug
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBugs.map(bug => (
              <Card key={bug.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Bug className="w-5 h-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{bug.title}</h3>
                      </div>

                      {bug.description && (
                        <p className="text-sm text-gray-600 mb-3">{bug.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(bug.severity)}`}>
                          {bug.severity}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(bug.status)}`}>
                          {bug.status}
                        </span>
                        {bug.environment && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {bug.environment}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                        {bug.test_run && (
                          <div>Test Run: <span className="font-medium">{bug.test_run.name}</span></div>
                        )}
                        {bug.test_case && (
                          <div>Test Case: <span className="font-medium">{bug.test_case.title}</span></div>
                        )}
                        {bug.reporter && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Reporter: <span className="font-medium">
                              {bug.reporter.full_name || bug.reporter.email}
                            </span>
                          </div>
                        )}
                        {bug.assignee && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Assigned: <span className="font-medium">
                              {bug.assignee.full_name || bug.assignee.email}
                            </span>
                          </div>
                        )}
                        <div>Created: {formatDateTime(bug.created_at)}</div>
                        {bug.external_link && (
                          <div>
                            <a
                              href={bug.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              External Link
                            </a>
                          </div>
                        )}
                      </div>

                      {bug.tags && bug.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {bug.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingBug(bug)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(bug)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(bug.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-3xl my-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingBug ? 'Edit Bug' : 'Report New Bug'}</CardTitle>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Bug Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Brief description of the bug"
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
                      placeholder="Detailed description..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Severity
                      </label>
                      <select
                        value={formData.severity}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as BugSeverity })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as BugStatus })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                        <option value="wont_fix">Won't Fix</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assign To
                      </label>
                      <select
                        value={formData.assigned_to}
                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Unassigned</option>
                        {allUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Steps to Reproduce
                    </label>
                    <textarea
                      value={formData.steps_to_reproduce}
                      onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="1. Go to...&#10;2. Click on...&#10;3. Notice that..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Behavior
                      </label>
                      <textarea
                        value={formData.expected_behavior}
                        onChange={(e) => setFormData({ ...formData, expected_behavior: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                        placeholder="What should happen..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Actual Behavior
                      </label>
                      <textarea
                        value={formData.actual_behavior}
                        onChange={(e) => setFormData({ ...formData, actual_behavior: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                        placeholder="What actually happens..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Environment
                      </label>
                      <select
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Environment</option>
                        <option value="Staging">Staging</option>
                        <option value="Preproduction">Preproduction</option>
                        <option value="Production">Production</option>
                      </select>
                    </div>

                    <Input
                      label="Browser"
                      value={formData.browser}
                      onChange={(e) => setFormData({ ...formData, browser: e.target.value })}
                      placeholder="Chrome 120, Safari 17, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Device"
                      value={formData.device}
                      onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                      placeholder="iPhone 14, Desktop, etc."
                    />

                    <Input
                      label="OS"
                      value={formData.os}
                      onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                      placeholder="iOS 17, Windows 11, etc."
                    />
                  </div>

                  <Input
                    label="External Link (Jira, GitHub, etc.)"
                    value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                    placeholder="https://..."
                  />

                  <Input
                    label="Tags (comma separated)"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="ui, login, critical"
                  />

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingBug ? 'Update' : 'Report'} Bug
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View Bug Detail Modal */}
        {viewingBug && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Bug className="w-6 h-6 text-gray-600" />
                    <CardTitle>Bug Details</CardTitle>
                  </div>
                  <button onClick={() => setViewingBug(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title & Badges */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{viewingBug.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSeverityColor(viewingBug.severity)}`}>
                      {viewingBug.severity.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(viewingBug.status)}`}>
                      {viewingBug.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {viewingBug.environment && (
                      <span className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                        {viewingBug.environment}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {viewingBug.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                    <p className="text-gray-900 whitespace-pre-wrap">{viewingBug.description}</p>
                  </div>
                )}

                {/* Steps to Reproduce */}
                {viewingBug.steps_to_reproduce && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Steps to Reproduce</h3>
                    <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{viewingBug.steps_to_reproduce}</p>
                  </div>
                )}

                {/* Expected vs Actual */}
                <div className="grid grid-cols-2 gap-4">
                  {viewingBug.expected_behavior && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Expected Behavior</h3>
                      <p className="text-gray-900 bg-green-50 p-3 rounded-lg">{viewingBug.expected_behavior}</p>
                    </div>
                  )}
                  {viewingBug.actual_behavior && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Actual Behavior</h3>
                      <p className="text-gray-900 bg-red-50 p-3 rounded-lg">{viewingBug.actual_behavior}</p>
                    </div>
                  )}
                </div>

                {/* Environment Details */}
                {(viewingBug.browser || viewingBug.device || viewingBug.os) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Environment Details</h3>
                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded-lg">
                      {viewingBug.browser && (
                        <div>
                          <span className="text-xs text-gray-500">Browser</span>
                          <p className="text-gray-900">{viewingBug.browser}</p>
                        </div>
                      )}
                      {viewingBug.device && (
                        <div>
                          <span className="text-xs text-gray-500">Device</span>
                          <p className="text-gray-900">{viewingBug.device}</p>
                        </div>
                      )}
                      {viewingBug.os && (
                        <div>
                          <span className="text-xs text-gray-500">OS</span>
                          <p className="text-gray-900">{viewingBug.os}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* People */}
                <div className="grid grid-cols-2 gap-4">
                  {viewingBug.reporter && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Reported by</span>
                        <p className="text-sm font-medium text-gray-900">
                          {viewingBug.reporter.full_name || viewingBug.reporter.email}
                        </p>
                      </div>
                    </div>
                  )}
                  {viewingBug.assignee && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Assigned to</span>
                        <p className="text-sm font-medium text-gray-900">
                          {viewingBug.assignee.full_name || viewingBug.assignee.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Related Test */}
                {(viewingBug.test_run || viewingBug.test_case) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Related Test</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                      {viewingBug.test_run && (
                        <p className="text-sm"><span className="text-gray-500">Test Run:</span> {viewingBug.test_run.name}</p>
                      )}
                      {viewingBug.test_case && (
                        <p className="text-sm"><span className="text-gray-500">Test Case:</span> {viewingBug.test_case.title}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* External Link */}
                {viewingBug.external_link && (
                  <div>
                    <a
                      href={viewingBug.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary-600 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View External Link
                    </a>
                  </div>
                )}

                {/* Tags */}
                {viewingBug.tags && viewingBug.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {viewingBug.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-700">
                      Comments ({comments.length})
                    </h3>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                    {loadingComments ? (
                      <p className="text-sm text-gray-500">Loading comments...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-gray-500">No comments yet</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-700">
                                {(comment.user?.full_name || comment.user?.email)?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {comment.user?.full_name || comment.user?.email}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap pl-8">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                      rows={2}
                    />
                    <Button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="self-end"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-sm text-gray-500 pt-4 border-t">
                  <p>Created: {formatDateTime(viewingBug.created_at)}</p>
                  {viewingBug.resolved_at && <p>Resolved: {formatDateTime(viewingBug.resolved_at)}</p>}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="secondary" onClick={() => setViewingBug(null)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    handleEdit(viewingBug)
                    setViewingBug(null)
                  }}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Bug
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}
