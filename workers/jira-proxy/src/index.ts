interface Env {
  ALLOWED_ORIGINS?: string
}

interface JiraBugPayload {
  title: string
  description: string | null
  severity: string
  steps_to_reproduce: string | null
  expected_behavior: string | null
  actual_behavior: string | null
  environment: string | null
  feature: string | null
  platform: string | null
  browser: string | null
  device: string | null
  os: string | null
  external_link: string | null
  tags: string[] | null
}

interface JiraConfig {
  jira_base_url: string
  jira_project_key: string
  jira_email: string
  jira_api_token: string
  default_issue_type: string
}

interface CreateIssueRequest {
  action: 'create-issue'
  bugId: string
  bug: JiraBugPayload
  config: JiraConfig
}

interface TestConnectionRequest {
  action: 'test-connection'
  config: {
    jira_base_url: string
    jira_email: string
    jira_api_token: string
  }
}

type RequestBody = CreateIssueRequest | TestConnectionRequest

function mapSeverityToPriority(severity: string): string {
  const priorityMap: Record<string, string> = {
    critical: 'Highest',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }
  return priorityMap[severity] || 'Medium'
}

function buildJiraDescription(bug: JiraBugPayload): object {
  // JIRA Cloud uses Atlassian Document Format (ADF)
  // Panel types: info (blue), error (red), success (green), warning (yellow), note (purple)

  const content: object[] = []

  // Helper to create a panel with colored background
  const addPanel = (panelType: 'info' | 'error' | 'success' | 'warning' | 'note', title: string, bodyText: string) => {
    content.push({
      type: 'panel',
      attrs: { panelType },
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: title, marks: [{ type: 'strong' }] }
          ]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: bodyText }]
        }
      ]
    })
  }

  // Helper to create a panel with bullet list
  const addPanelWithList = (panelType: 'info' | 'error' | 'success' | 'warning' | 'note', title: string, items: string[]) => {
    content.push({
      type: 'panel',
      attrs: { panelType },
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: title, marks: [{ type: 'strong' }] }
          ]
        },
        {
          type: 'bulletList',
          content: items.map(item => ({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: item }]
            }]
          }))
        }
      ]
    })
  }

  // Description - Info (blue)
  if (bug.description) {
    addPanel('info', '📋 Description', bug.description)
  }

  // Steps to Reproduce - Warning (yellow)
  if (bug.steps_to_reproduce) {
    addPanel('warning', '🔄 Steps to Reproduce', bug.steps_to_reproduce)
  }

  // Expected Behavior - Success (green)
  if (bug.expected_behavior) {
    addPanel('success', '✅ Expected Behavior', bug.expected_behavior)
  }

  // Actual Behavior - Error (red)
  if (bug.actual_behavior) {
    addPanel('error', '❌ Actual Behavior', bug.actual_behavior)
  }

  // Feature & Platform - Info (blue)
  const featurePlatformDetails = [
    bug.feature && `Feature: ${bug.feature}`,
    bug.platform && `Platform: ${bug.platform}`,
  ].filter(Boolean) as string[]

  if (featurePlatformDetails.length > 0) {
    addPanelWithList('info', '🎯 Feature & Platform', featurePlatformDetails)
  }

  // Environment Details - Note (purple)
  const envDetails = [
    bug.environment && `Environment: ${bug.environment}`,
    bug.browser && `Browser: ${bug.browser}`,
    bug.device && `Device: ${bug.device}`,
    bug.os && `OS: ${bug.os}`,
  ].filter(Boolean) as string[]

  if (envDetails.length > 0) {
    addPanelWithList('note', '🖥️ Environment Details', envDetails)
  }

  // Evidence Link
  if (bug.external_link) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: '📎 Evidence: ', marks: [{ type: 'strong' }] },
        {
          type: 'text',
          text: bug.external_link,
          marks: [{ type: 'link', attrs: { href: bug.external_link } }]
        }
      ]
    })
  }

  // Tags
  if (bug.tags && bug.tags.length > 0) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: '🏷️ Tags: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: bug.tags.join(', ') }
      ]
    })
  }

  // Add footer
  content.push({
    type: 'rule'
  })
  content.push({
    type: 'paragraph',
    content: [{
      type: 'text',
      text: 'Created from TestHub',
      marks: [{ type: 'em' }]
    }]
  })

  return {
    type: 'doc',
    version: 1,
    content
  }
}

function getCorsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || []

  // In development, allow localhost
  const isAllowed =
    !origin ||
    allowedOrigins.length === 0 ||
    allowedOrigins.includes(origin) ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.endsWith('.pages.dev')

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin || '*' : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

async function handleCreateIssue(
  request: CreateIssueRequest
): Promise<Response> {
  const { bug, config } = request

  // Build fields object
  // Note: labels field is intentionally excluded as many JIRA projects don't have it enabled
  // Tags from the bug are included in the description instead
  const fields: Record<string, unknown> = {
    project: { key: config.jira_project_key },
    summary: bug.title,
    description: buildJiraDescription(bug),
    issuetype: { name: config.default_issue_type || 'Bug' },
  }

  // Only add priority if it's a valid value
  // Some JIRA projects have different priority configurations
  try {
    fields.priority = { name: mapSeverityToPriority(bug.severity) }
  } catch {
    // Skip priority if mapping fails
  }

  const jiraPayload = { fields }

  const authHeader = btoa(`${config.jira_email}:${config.jira_api_token}`)

  try {
    const response = await fetch(
      `${config.jira_base_url}/rest/api/3/issue`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(jiraPayload),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('JIRA API Error:', response.status, errorBody)
      return new Response(
        JSON.stringify({
          success: false,
          error: `JIRA API Error: ${response.status} - ${errorBody}`,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const data = (await response.json()) as { id: string; key: string; self: string }
    const ticketUrl = `${config.jira_base_url}/browse/${data.key}`

    return new Response(
      JSON.stringify({
        success: true,
        key: data.key,
        url: ticketUrl,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Network error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to connect to JIRA. Please check the base URL.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

async function handleTestConnection(
  request: TestConnectionRequest
): Promise<Response> {
  const { config } = request
  const authHeader = btoa(`${config.jira_email}:${config.jira_api_token}`)

  try {
    const response = await fetch(`${config.jira_base_url}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authentication failed: ${response.status}`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const user = (await response.json()) as { displayName: string; emailAddress: string }
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          displayName: user.displayName,
          email: user.emailAddress,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to connect to JIRA. Please check the base URL.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    const corsHeaders = getCorsHeaders(origin, env)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    try {
      const body = (await request.json()) as RequestBody

      let response: Response

      switch (body.action) {
        case 'create-issue':
          response = await handleCreateIssue(body)
          break
        case 'test-connection':
          response = await handleTestConnection(body)
          break
        default:
          response = new Response(
            JSON.stringify({ error: 'Unknown action' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
      }

      // Add CORS headers to response
      const newHeaders = new Headers(response.headers)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value)
      })

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
  },
}
