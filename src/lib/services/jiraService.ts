import { supabase } from '../supabase'
import type { JiraConfiguration, JiraConfigInput, JiraCreateTicketResult, JiraBugPayload } from '../../types/jira'
import type { Database } from '../../types/database'

type BugRow = Database['public']['Tables']['bugs']['Row']

// URL of the Cloudflare Worker - should be configured via environment variable
const JIRA_PROXY_URL = import.meta.env.VITE_JIRA_PROXY_URL || 'http://localhost:8787'

export const jiraService = {
  /**
   * Check if JIRA is configured and enabled for a project
   */
  async isConfigured(projectId: string): Promise<boolean> {
    const { data } = await supabase
      .from('jira_configurations')
      .select('id, enabled')
      .eq('project_id', projectId)
      .maybeSingle()
    return data?.enabled ?? false
  },

  /**
   * Get JIRA configuration for a project (without API token for security)
   */
  async getConfiguration(projectId: string): Promise<JiraConfiguration | null> {
    const { data } = await supabase
      .from('jira_configurations')
      .select('id, project_id, jira_base_url, jira_project_key, jira_email, default_issue_type, enabled, created_by, created_at, updated_at')
      .eq('project_id', projectId)
      .maybeSingle()

    if (!data) {
      return null
    }

    return data as JiraConfiguration
  },

  /**
   * Get full JIRA configuration including API token (for internal use only)
   */
  async getFullConfiguration(projectId: string): Promise<(JiraConfiguration & { jira_api_token: string }) | null> {
    const { data } = await supabase
      .from('jira_configurations')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (!data) {
      return null
    }

    return data as JiraConfiguration & { jira_api_token: string }
  },

  /**
   * Create JIRA ticket via Cloudflare Worker
   */
  async createTicket(bug: BugRow, projectId: string): Promise<JiraCreateTicketResult> {
    try {
      // Get full config including API token
      const config = await this.getFullConfiguration(projectId)

      if (!config || !config.enabled) {
        return {
          success: false,
          error: 'JIRA is not configured for this project. Please configure JIRA in project settings.',
        }
      }

      const bugPayload: JiraBugPayload = {
        title: bug.title,
        description: bug.description,
        severity: bug.severity,
        steps_to_reproduce: bug.steps_to_reproduce,
        expected_behavior: bug.expected_behavior,
        actual_behavior: bug.actual_behavior,
        environment: bug.environment,
        browser: bug.browser,
        device: bug.device,
        os: bug.os,
        tags: bug.tags,
      }

      const response = await fetch(JIRA_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-issue',
          bugId: bug.id,
          bug: bugPayload,
          config: {
            jira_base_url: config.jira_base_url,
            jira_project_key: config.jira_project_key,
            jira_email: config.jira_email,
            jira_api_token: config.jira_api_token,
            default_issue_type: config.default_issue_type,
          },
        }),
      })

      const data = await response.json() as { success: boolean; key?: string; url?: string; error?: string }

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to create JIRA ticket',
        }
      }

      // Update bug with JIRA ticket info
      await supabase
        .from('bugs')
        .update({
          jira_ticket_key: data.key,
          jira_ticket_url: data.url,
          jira_created_at: new Date().toISOString(),
        })
        .eq('id', bug.id)

      return {
        success: true,
        ticketKey: data.key,
        ticketUrl: data.url,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  /**
   * Save JIRA configuration for a project
   */
  async saveConfiguration(
    projectId: string,
    config: JiraConfigInput,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if configuration already exists
      const { data: existing } = await supabase
        .from('jira_configurations')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle()

      if (existing) {
        // Update existing configuration
        const { error } = await supabase
          .from('jira_configurations')
          .update({
            jira_base_url: config.jira_base_url,
            jira_project_key: config.jira_project_key,
            jira_email: config.jira_email,
            jira_api_token: config.jira_api_token,
            default_issue_type: config.default_issue_type,
            enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('project_id', projectId)

        if (error) {
          return { success: false, error: error.message }
        }
      } else {
        // Insert new configuration
        const { error } = await supabase
          .from('jira_configurations')
          .insert({
            project_id: projectId,
            jira_base_url: config.jira_base_url,
            jira_project_key: config.jira_project_key,
            jira_email: config.jira_email,
            jira_api_token: config.jira_api_token,
            default_issue_type: config.default_issue_type,
            enabled: true,
            created_by: userId,
          })

        if (error) {
          return { success: false, error: error.message }
        }
      }

      return { success: true }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration'
      return { success: false, error: errorMessage }
    }
  },

  /**
   * Test JIRA connection
   */
  async testConnection(config: Pick<JiraConfigInput, 'jira_base_url' | 'jira_email' | 'jira_api_token'>): Promise<{ success: boolean; error?: string; user?: { displayName: string; email: string } }> {
    try {
      const response = await fetch(JIRA_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test-connection',
          config: {
            jira_base_url: config.jira_base_url,
            jira_email: config.jira_email,
            jira_api_token: config.jira_api_token,
          },
        }),
      })

      const data = await response.json() as { success: boolean; error?: string; user?: { displayName: string; email: string } }
      return data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to JIRA'
      return { success: false, error: errorMessage }
    }
  },

  /**
   * Enable or disable JIRA integration for a project
   */
  async setEnabled(projectId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('jira_configurations')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('project_id', projectId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  },

  /**
   * Delete JIRA configuration for a project
   */
  async deleteConfiguration(projectId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('jira_configurations')
      .delete()
      .eq('project_id', projectId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  },
}
