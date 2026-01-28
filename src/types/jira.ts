export interface JiraConfiguration {
  id: string
  project_id: string
  jira_base_url: string
  jira_project_key: string
  jira_email: string
  default_issue_type: string
  enabled: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface JiraConfigInput {
  jira_base_url: string
  jira_project_key: string
  jira_email: string
  jira_api_token: string
  default_issue_type: string
}

export interface JiraCreateTicketResult {
  success: boolean
  ticketKey?: string
  ticketUrl?: string
  error?: string
}

export interface JiraBugPayload {
  title: string
  description: string | null
  severity: string
  steps_to_reproduce: string | null
  expected_behavior: string | null
  actual_behavior: string | null
  environment: string | null
  browser: string | null
  device: string | null
  os: string | null
  tags: string[] | null
}

export interface JiraCreateIssueRequest {
  action: 'create-issue'
  bugId: string
  bug: JiraBugPayload
  config: {
    jira_base_url: string
    jira_project_key: string
    jira_email: string
    jira_api_token: string
    default_issue_type: string
  }
}

export interface JiraTestConnectionRequest {
  action: 'test-connection'
  config: {
    jira_base_url: string
    jira_email: string
    jira_api_token: string
  }
}

export interface JiraCreateIssueResponse {
  success: boolean
  key?: string
  url?: string
  error?: string
}
