import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { X, Settings, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { jiraService } from '@/lib/services/jiraService'
import { useAuthStore } from '@/store/authStore'
import type { JiraConfiguration } from '@/types/jira'

interface JiraConfigModalProps {
  projectId: string
  projectName: string
  onClose: () => void
  onSaved?: () => void
}

export default function JiraConfigModal({ projectId, projectName, onClose, onSaved }: JiraConfigModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [existingConfig, setExistingConfig] = useState<JiraConfiguration | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [formData, setFormData] = useState({
    jira_base_url: '',
    jira_project_key: '',
    jira_email: '',
    jira_api_token: '',
    default_issue_type: 'Bug',
  })

  useEffect(() => {
    loadConfig()
  }, [projectId])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const config = await jiraService.getFullConfiguration(projectId)
      if (config) {
        setExistingConfig(config)
        setFormData({
          jira_base_url: config.jira_base_url,
          jira_project_key: config.jira_project_key,
          jira_email: config.jira_email,
          jira_api_token: config.jira_api_token,
          default_issue_type: config.default_issue_type,
        })
      }
    } catch (err) {
      console.error('Error loading JIRA config:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setTestResult(null)
    setError('')

    if (!formData.jira_base_url || !formData.jira_email || !formData.jira_api_token) {
      setError('Please fill in JIRA URL, Email, and API Token to test connection')
      return
    }

    setTesting(true)
    try {
      const result = await jiraService.testConnection({
        jira_base_url: formData.jira_base_url,
        jira_email: formData.jira_email,
        jira_api_token: formData.jira_api_token,
      })

      if (result.success) {
        setTestResult({
          success: true,
          message: `Connected successfully as ${result.user?.displayName || result.user?.email}`,
        })
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Connection failed',
        })
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (!formData.jira_base_url || !formData.jira_project_key || !formData.jira_email || !formData.jira_api_token) {
      setError('Please fill in all required fields')
      return
    }

    if (!user?.id) {
      setError('You must be logged in to save configuration')
      return
    }

    setSaving(true)
    try {
      const result = await jiraService.saveConfiguration(projectId, formData, user.id)

      if (result.success) {
        setSuccess('JIRA configuration saved successfully!')
        onSaved?.()
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Failed to save configuration')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete JIRA configuration? This will not affect existing JIRA tickets.')) {
      return
    }

    setSaving(true)
    try {
      const result = await jiraService.deleteConfiguration(projectId)
      if (result.success) {
        setSuccess('JIRA configuration deleted')
        onSaved?.()
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Failed to delete configuration')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <CardTitle>JIRA Integration</CardTitle>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure JIRA integration for <span className="font-medium">{projectName}</span>
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              <Input
                label="JIRA Base URL"
                value={formData.jira_base_url}
                onChange={(e) => setFormData({ ...formData, jira_base_url: e.target.value })}
                placeholder="https://your-company.atlassian.net"
                required
              />

              <Input
                label="JIRA Project Key"
                value={formData.jira_project_key}
                onChange={(e) => setFormData({ ...formData, jira_project_key: e.target.value.toUpperCase() })}
                placeholder="e.g., QA, PROJ, BUG"
                required
              />

              <Input
                label="JIRA Email"
                type="email"
                value={formData.jira_email}
                onChange={(e) => setFormData({ ...formData, jira_email: e.target.value })}
                placeholder="your-email@company.com"
                required
              />

              <div>
                <Input
                  label="JIRA API Token"
                  type="password"
                  value={formData.jira_api_token}
                  onChange={(e) => setFormData({ ...formData, jira_api_token: e.target.value })}
                  placeholder="••••••••••••••••"
                  required
                />
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Generate API Token <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Issue Type
                </label>
                <select
                  value={formData.default_issue_type}
                  onChange={(e) => setFormData({ ...formData, default_issue_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                  <option value="Story">Story</option>
                </select>
              </div>

              {testResult && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    testResult.success
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  {testResult.message}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={testing || saving}
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>

                <div className="flex-1" />

                {existingConfig && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDelete}
                    disabled={saving || testing}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || testing}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : existingConfig ? (
                    'Update'
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
