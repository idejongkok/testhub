import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { usePermissions } from '@/hooks/usePermissions'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, X, Edit2, Trash2, Bug, ExternalLink, User, Eye, MessageSquare, Send, Ticket, Settings, Loader2, Link2, Check, Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { jiraService } from '@/lib/services/jiraService'
import JiraConfigModal from '@/components/JiraConfigModal'
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
  const { canDelete, canConfigureJira } = usePermissions()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [bugs, setBugs] = useState<BugRow[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [viewingBug, setViewingBug] = useState<BugRow | null>(null)
  const [editingBug, setEditingBug] = useState<BugRow | null>(null)
  // Initialize filters from URL params
  const [statusFilter, setStatusFilter] = useState<BugStatus | 'all'>(() => {
    const param = searchParams.get('status')
    return (param as BugStatus | 'all') || 'all'
  })
  const [severityFilter, setSeverityFilter] = useState<BugSeverity | 'all'>(() => {
    const param = searchParams.get('severity')
    return (param as BugSeverity | 'all') || 'all'
  })
  const [, setPrefillData] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [comments, setComments] = useState<BugComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    // Auto-expand advanced filters if any advanced filter is set in URL
    return !!(searchParams.get('platform') || searchParams.get('environment') ||
              searchParams.get('feature') || searchParams.get('browser') ||
              searchParams.get('assignee') || searchParams.get('reporter'))
  })
  const [platformFilter, setPlatformFilter] = useState<string>(() => searchParams.get('platform') || 'all')
  const [environmentFilter, setEnvironmentFilter] = useState<string>(() => searchParams.get('environment') || 'all')
  const [featureFilter, setFeatureFilter] = useState<string>(() => searchParams.get('feature') || 'all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>(() => searchParams.get('assignee') || 'all')
  const [reporterFilter, setReporterFilter] = useState<string>(() => searchParams.get('reporter') || 'all')
  const [browserFilter, setBrowserFilter] = useState<string>(() => searchParams.get('browser') || 'all')
  const [creatingJiraFor, setCreatingJiraFor] = useState<string | null>(null)
  const [jiraConfigured, setJiraConfigured] = useState(false)
  const [showJiraConfig, setShowJiraConfig] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [filterLinkCopied, setFilterLinkCopied] = useState(false)

  // Sync filters to URL params
  const updateFilterParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
    })

    setSearchParams(newParams, { replace: true })
  }

  // Wrapper functions to update both state and URL
  const handleStatusFilterChange = (value: BugStatus | 'all') => {
    setStatusFilter(value)
    updateFilterParams({ status: value })
  }

  const handleSeverityFilterChange = (value: BugSeverity | 'all') => {
    setSeverityFilter(value)
    updateFilterParams({ severity: value })
  }

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value)
    updateFilterParams({ q: value })
  }

  const handlePlatformFilterChange = (value: string) => {
    setPlatformFilter(value)
    updateFilterParams({ platform: value })
  }

  const handleEnvironmentFilterChange = (value: string) => {
    setEnvironmentFilter(value)
    updateFilterParams({ environment: value })
  }

  const handleFeatureFilterChange = (value: string) => {
    setFeatureFilter(value)
    updateFilterParams({ feature: value })
  }

  const handleBrowserFilterChange = (value: string) => {
    setBrowserFilter(value)
    updateFilterParams({ browser: value })
  }

  const handleAssigneeFilterChange = (value: string) => {
    setAssigneeFilter(value)
    updateFilterParams({ assignee: value })
  }

  const handleReporterFilterChange = (value: string) => {
    setReporterFilter(value)
    updateFilterParams({ reporter: value })
  }

  // Copy filtered view link
  const copyFilteredLink = async () => {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    setFilterLinkCopied(true)
    setTimeout(() => setFilterLinkCopied(false), 2000)
  }

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as BugSeverity,
    status: 'open' as BugStatus,
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    environment: '',
    feature: '',
    platform: '',
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
      checkJiraConfig()
    }
  }, [currentProject])

  // Handle bugId URL parameter
  useEffect(() => {
    const bugId = searchParams.get('bugId')
    if (bugId && bugs.length > 0) {
      const bug = bugs.find(b => b.id === bugId)
      if (bug) {
        setViewingBug(bug)
      }
    }
  }, [searchParams, bugs])

  const checkJiraConfig = async () => {
    if (!currentProject) return
    const configured = await jiraService.isConfigured(currentProject.id)
    setJiraConfigured(configured)
  }

  // Open bug detail and update URL
  const openBugDetail = (bug: BugRow) => {
    setViewingBug(bug)
    setSearchParams({ bugId: bug.id })
  }

  // Close bug detail and remove URL param
  const closeBugDetail = () => {
    setViewingBug(null)
    searchParams.delete('bugId')
    setSearchParams(searchParams)
  }

  // Copy shareable link to clipboard
  const copyBugLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?bugId=${viewingBug?.id}`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleCreateJiraTicket = async (bug: BugRow) => {
    if (!currentProject) return
    if (bug.jira_ticket_key) {
      alert('JIRA ticket already exists for this bug')
      return
    }

    setCreatingJiraFor(bug.id)
    try {
      const result = await jiraService.createTicket(bug, currentProject.id)
      if (result.success) {
        alert(`JIRA ticket ${result.ticketKey} created successfully!`)
        fetchBugs()
      } else {
        alert(result.error || 'Failed to create JIRA ticket')
      }
    } catch (error) {
      alert('An unexpected error occurred')
    } finally {
      setCreatingJiraFor(null)
    }
  }

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
      feature: formData.feature || null,
      platform: formData.platform || null,
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
      feature: bug.feature || '',
      platform: bug.platform || '',
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
      feature: '',
      platform: '',
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

  // Get unique values for filter dropdowns
  const uniquePlatforms = [...new Set(bugs.map(b => b.platform).filter(Boolean))] as string[]
  const uniqueEnvironments = [...new Set(bugs.map(b => b.environment).filter(Boolean))] as string[]
  const uniqueFeatures = [...new Set(bugs.map(b => b.feature).filter(Boolean))] as string[]
  const uniqueBrowsers = [...new Set(bugs.map(b => b.browser).filter(Boolean))] as string[]

  // Status priority for sorting (lower number = higher priority)
  const statusPriority: Record<BugStatus, number> = {
    open: 1,
    in_progress: 2,
    resolved: 3,
    closed: 4,
    wont_fix: 5,
  }

  const filteredBugs = bugs.filter(bug => {
    // Basic filters
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter
    const matchesSeverity = severityFilter === 'all' || bug.severity === severityFilter

    // Text search - searches across multiple fields
    const query = searchQuery.toLowerCase()
    const matchesSearch = searchQuery === '' ||
      bug.title.toLowerCase().includes(query) ||
      bug.description?.toLowerCase().includes(query) ||
      bug.feature?.toLowerCase().includes(query) ||
      bug.platform?.toLowerCase().includes(query) ||
      bug.environment?.toLowerCase().includes(query) ||
      bug.browser?.toLowerCase().includes(query) ||
      bug.device?.toLowerCase().includes(query) ||
      bug.os?.toLowerCase().includes(query) ||
      bug.steps_to_reproduce?.toLowerCase().includes(query) ||
      bug.actual_behavior?.toLowerCase().includes(query) ||
      bug.expected_behavior?.toLowerCase().includes(query) ||
      bug.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      bug.assignee?.full_name?.toLowerCase().includes(query) ||
      bug.assignee?.email?.toLowerCase().includes(query) ||
      bug.reporter?.full_name?.toLowerCase().includes(query) ||
      bug.reporter?.email?.toLowerCase().includes(query)

    // Advanced filters
    const matchesPlatform = platformFilter === 'all' || bug.platform === platformFilter
    const matchesEnvironment = environmentFilter === 'all' || bug.environment === environmentFilter
    const matchesFeature = featureFilter === 'all' || bug.feature === featureFilter
    const matchesBrowser = browserFilter === 'all' || bug.browser === browserFilter
    const matchesAssignee = assigneeFilter === 'all' ||
      (assigneeFilter === '' ? !bug.assigned_to : bug.assigned_to === assigneeFilter)
    const matchesReporter = reporterFilter === 'all' || bug.reported_by === reporterFilter

    return matchesStatus && matchesSeverity && matchesSearch &&
           matchesPlatform && matchesEnvironment && matchesFeature &&
           matchesBrowser && matchesAssignee && matchesReporter
  }).sort((a, b) => {
    // Sort by status priority (open first, then in_progress, resolved, closed, wont_fix)
    const priorityDiff = statusPriority[a.status] - statusPriority[b.status]
    if (priorityDiff !== 0) return priorityDiff
    // Secondary sort by created_at (newest first) within same status
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Count active filters
  const activeFilterCount = [
    statusFilter !== 'all',
    severityFilter !== 'all',
    platformFilter !== 'all',
    environmentFilter !== 'all',
    featureFilter !== 'all',
    browserFilter !== 'all',
    assigneeFilter !== 'all',
    reporterFilter !== 'all',
  ].filter(Boolean).length

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSeverityFilter('all')
    setPlatformFilter('all')
    setEnvironmentFilter('all')
    setFeatureFilter('all')
    setBrowserFilter('all')
    setAssigneeFilter('all')
    setReporterFilter('all')

    // Clear all filter params from URL, keep bugId if present
    const newParams = new URLSearchParams()
    const bugId = searchParams.get('bugId')
    if (bugId) newParams.set('bugId', bugId)
    setSearchParams(newParams, { replace: true })
  }

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
      <div className="max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-gray-50 pb-4">
          <div className="flex justify-between items-center mb-4">
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
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowJiraConfig(true)}
                title={canConfigureJira ? "JIRA Settings" : "Only administrators can configure JIRA"}
                disabled={!canConfigureJira}
                className={!canConfigureJira ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Settings className="w-4 h-4 mr-2" />
                JIRA
              </Button>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Report Bug
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="shadow-sm">
          <CardContent className="py-4">
            {/* Main Filter Row */}
            <div className="flex flex-wrap gap-3 items-center">
              <Input
                placeholder="Search title, description, feature, platform, assignee..."
                value={searchQuery}
                onChange={(e) => handleSearchQueryChange(e.target.value)}
                className="flex-1 min-w-[250px] max-w-md"
              />

              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value as BugStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                onChange={(e) => handleSeverityFilterChange(e.target.value as BugSeverity | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  showAdvancedFilters || activeFilterCount > 0
                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                More Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                    {activeFilterCount}
                  </span>
                )}
                {showAdvancedFilters ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {(activeFilterCount > 0 || searchQuery) && (
                <>
                  <button
                    onClick={copyFilteredLink}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Copy link with current filters"
                  >
                    {filterLinkCopied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Platform */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
                    <select
                      value={platformFilter}
                      onChange={(e) => handlePlatformFilterChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="all">All Platforms</option>
                      {uniquePlatforms.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Environment */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Environment</label>
                    <select
                      value={environmentFilter}
                      onChange={(e) => handleEnvironmentFilterChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="all">All Environments</option>
                      {uniqueEnvironments.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>

                  {/* Feature */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Feature</label>
                    <select
                      value={featureFilter}
                      onChange={(e) => handleFeatureFilterChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="all">All Features</option>
                      {uniqueFeatures.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  {/* Browser */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Browser</label>
                    <select
                      value={browserFilter}
                      onChange={(e) => handleBrowserFilterChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="all">All Browsers</option>
                      {uniqueBrowsers.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Assignee</label>
                    <select
                      value={assigneeFilter}
                      onChange={(e) => handleAssigneeFilterChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="all">All Assignees</option>
                      <option value="">Unassigned</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reporter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Reporter</label>
                    <select
                      value={reporterFilter}
                      onChange={(e) => handleReporterFilterChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="all">All Reporters</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {(searchQuery || activeFilterCount > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Found <span className="font-medium text-gray-900">{filteredBugs.length}</span> of {bugs.length} bugs
                </span>
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {statusFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Status: {statusFilter}
                      </span>
                    )}
                    {severityFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Severity: {severityFilter}
                      </span>
                    )}
                    {platformFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Platform: {platformFilter}
                      </span>
                    )}
                    {environmentFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Env: {environmentFilter}
                      </span>
                    )}
                    {featureFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Feature: {featureFilter}
                      </span>
                    )}
                    {browserFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Browser: {browserFilter}
                      </span>
                    )}
                    {assigneeFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Assignee: {assigneeFilter === '' ? 'Unassigned' : allUsers.find(u => u.id === assigneeFilter)?.full_name || 'Selected'}
                      </span>
                    )}
                    {reporterFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Reporter: {allUsers.find(u => u.id === reporterFilter)?.full_name || 'Selected'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Bugs List - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-6">
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
          <div className="space-y-3">
            {filteredBugs.map(bug => (
              <Card key={bug.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex">
                  {/* Status Color Bar */}
                  <div className={`w-1.5 flex-shrink-0 ${
                    bug.status === 'open' ? 'bg-red-500' :
                    bug.status === 'in_progress' ? 'bg-blue-500' :
                    bug.status === 'resolved' ? 'bg-green-500' :
                    bug.status === 'closed' ? 'bg-gray-400' :
                    'bg-purple-500'
                  }`} />

                  <CardContent className="flex-1 p-4">
                    <div className="flex justify-between items-start gap-4">
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header: Title + Status */}
                        <div className="flex items-start gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {bug.title}
                            </h3>
                            {bug.description && (
                              <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                                {bug.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          {/* Status */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400">Status:</span>
                            <span className={`font-medium ${
                              bug.status === 'open' ? 'text-red-600' :
                              bug.status === 'in_progress' ? 'text-blue-600' :
                              bug.status === 'resolved' ? 'text-green-600' :
                              bug.status === 'closed' ? 'text-gray-600' :
                              'text-purple-600'
                            }`}>
                              {bug.status === 'in_progress' ? 'In Progress' :
                               bug.status === 'wont_fix' ? "Won't Fix" :
                               bug.status.charAt(0).toUpperCase() + bug.status.slice(1)}
                            </span>
                          </div>

                          <span className="text-gray-300">•</span>

                          {/* Severity */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400">Severity:</span>
                            <span className={`font-medium ${
                              bug.severity === 'critical' ? 'text-red-600' :
                              bug.severity === 'high' ? 'text-orange-600' :
                              bug.severity === 'medium' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>
                              {bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1)}
                            </span>
                          </div>

                          {bug.environment && (
                            <>
                              <span className="text-gray-300">•</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400">Env:</span>
                                <span className="font-medium text-gray-700">{bug.environment}</span>
                              </div>
                            </>
                          )}

                          {bug.feature && (
                            <>
                              <span className="text-gray-300">•</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400">Feature:</span>
                                <span className="font-medium text-gray-700">{bug.feature}</span>
                              </div>
                            </>
                          )}

                          {bug.platform && (
                            <>
                              <span className="text-gray-300">•</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400">Platform:</span>
                                <span className="font-medium text-gray-700">{bug.platform}</span>
                              </div>
                            </>
                          )}

                          {bug.assignee && (
                            <>
                              <span className="text-gray-300">•</span>
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-gray-400" />
                                <span className="font-medium text-gray-700">
                                  {bug.assignee.full_name || bug.assignee.email?.split('@')[0]}
                                </span>
                              </div>
                            </>
                          )}

                          <span className="text-gray-300">•</span>
                          <span className="text-gray-400">{formatDateTime(bug.created_at)}</span>
                        </div>

                        {/* Tags */}
                        {bug.tags && bug.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {bug.tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                                {tag}
                              </span>
                            ))}
                            {bug.tags.length > 3 && (
                              <span className="px-1.5 py-0.5 text-xs text-gray-400">
                                +{bug.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openBugDetail(bug)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(bug)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(bug.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* JIRA Button - Only for Production bugs */}
                        {bug.environment === 'Production' && (
                          bug.jira_ticket_key ? (
                            <a
                              href={bug.jira_ticket_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={`JIRA: ${bug.jira_ticket_key}`}
                            >
                              <Ticket className="w-4 h-4" />
                            </a>
                          ) : (
                            <button
                              onClick={() => handleCreateJiraTicket(bug)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={jiraConfigured ? "Create JIRA Ticket" : "Configure JIRA first"}
                              disabled={creatingJiraFor === bug.id || !jiraConfigured}
                            >
                              {creatingJiraFor === bug.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Ticket className="w-4 h-4" />
                              )}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
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

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Feature"
                      value={formData.feature}
                      onChange={(e) => setFormData({ ...formData, feature: e.target.value })}
                      placeholder="login, bulk order, checkout, etc."
                    />

                    <Input
                      label="Platform"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      placeholder="web, internal dashboard, android, etc."
                    />
                  </div>

                  <Input
                    label="Evidence (Google Drive Link)"
                    value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                    placeholder="https://drive.google.com/..."
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

        {/* JIRA Config Modal */}
        {showJiraConfig && currentProject && (
          <JiraConfigModal
            projectId={currentProject.id}
            projectName={currentProject.name}
            onClose={() => setShowJiraConfig(false)}
            onSaved={() => checkJiraConfig()}
          />
        )}

        {/* View Bug Detail Modal */}
        {viewingBug && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
              <CardHeader className="pb-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{viewingBug.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={copyBugLink}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Copy shareable link"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                    <button onClick={closeBugDetail} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {/* Status Info Grid */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
                    <p className={`text-sm font-semibold mt-1 ${
                      viewingBug.status === 'open' ? 'text-red-600' :
                      viewingBug.status === 'in_progress' ? 'text-blue-600' :
                      viewingBug.status === 'resolved' ? 'text-green-600' :
                      viewingBug.status === 'closed' ? 'text-gray-600' :
                      'text-purple-600'
                    }`}>
                      {viewingBug.status === 'in_progress' ? 'In Progress' :
                       viewingBug.status === 'wont_fix' ? "Won't Fix" :
                       viewingBug.status.charAt(0).toUpperCase() + viewingBug.status.slice(1)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Severity</span>
                    <p className={`text-sm font-semibold mt-1 ${
                      viewingBug.severity === 'critical' ? 'text-red-600' :
                      viewingBug.severity === 'high' ? 'text-orange-600' :
                      viewingBug.severity === 'medium' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {viewingBug.severity.charAt(0).toUpperCase() + viewingBug.severity.slice(1)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Environment</span>
                    <p className="text-sm font-semibold mt-1 text-gray-900">
                      {viewingBug.environment || '-'}
                    </p>
                  </div>
                </div>

                {/* Feature & Platform */}
                {(viewingBug.feature || viewingBug.platform) && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Feature</span>
                      <p className="text-sm font-semibold mt-1 text-gray-900">
                        {viewingBug.feature || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Platform</span>
                      <p className="text-sm font-semibold mt-1 text-gray-900">
                        {viewingBug.platform || '-'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {viewingBug.description && (
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Description</h3>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{viewingBug.description}</p>
                  </div>
                )}

                {/* Steps to Reproduce */}
                {viewingBug.steps_to_reproduce && (
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Steps to Reproduce</h3>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{viewingBug.steps_to_reproduce}</p>
                  </div>
                )}

                {/* Expected vs Actual */}
                {(viewingBug.expected_behavior || viewingBug.actual_behavior) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Expected Behavior</h3>
                      <p className="text-sm text-gray-900 bg-green-50 p-3 rounded-lg min-h-[60px]">
                        {viewingBug.expected_behavior || '-'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Actual Behavior</h3>
                      <p className="text-sm text-gray-900 bg-red-50 p-3 rounded-lg min-h-[60px]">
                        {viewingBug.actual_behavior || '-'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Environment Details */}
                {(viewingBug.browser || viewingBug.device || viewingBug.os) && (
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Environment Details</h3>
                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Browser</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingBug.browser || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Device</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingBug.device || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">OS</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingBug.os || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* People */}
                {(viewingBug.reporter || viewingBug.assignee) && (
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">People</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Reported by</span>
                          <p className="text-sm font-medium text-gray-900">
                            {viewingBug.reporter?.full_name || viewingBug.reporter?.email || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Assigned to</span>
                          <p className="text-sm font-medium text-gray-900">
                            {viewingBug.assignee?.full_name || viewingBug.assignee?.email || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Related Test */}
                {(viewingBug.test_run || viewingBug.test_case) && (
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Related Test</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Test Run</span>
                          <p className="text-sm font-medium text-gray-900 mt-1">{viewingBug.test_run?.name || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Test Case</span>
                          <p className="text-sm font-medium text-gray-900 mt-1">{viewingBug.test_case?.title || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence */}
                {viewingBug.external_link && (
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Evidence</h3>
                    <a
                      href={viewingBug.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 hover:underline bg-primary-50 px-3 py-2 rounded-lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Evidence on Google Drive
                    </a>
                  </div>
                )}

                {/* JIRA Ticket */}
                {viewingBug.jira_ticket_key && (
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">JIRA Ticket</h3>
                    <a
                      href={viewingBug.jira_ticket_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 px-3 py-2 rounded-lg"
                    >
                      <Ticket className="w-4 h-4" />
                      {viewingBug.jira_ticket_key}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {viewingBug.jira_created_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {formatDateTime(viewingBug.jira_created_at)}
                      </p>
                    )}
                  </div>
                )}

                {/* Tags */}
                {viewingBug.tags && viewingBug.tags.length > 0 && (
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {viewingBug.tags.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide">
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
                <div className="pt-4 border-t">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                    <div>
                      <span className="uppercase tracking-wide">Created:</span>
                      <span className="ml-1 text-gray-700">{formatDateTime(viewingBug.created_at)}</span>
                    </div>
                    {viewingBug.resolved_at && (
                      <div>
                        <span className="uppercase tracking-wide">Resolved:</span>
                        <span className="ml-1 text-gray-700">{formatDateTime(viewingBug.resolved_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="secondary" onClick={closeBugDetail}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    handleEdit(viewingBug)
                    closeBugDetail()
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
