import { TestType, Priority, Status } from '@/types/database'

interface QaseCSVRow {
  'v2.id': string
  'title': string
  'description': string
  'preconditions': string
  'postconditions': string
  'tags': string
  'priority': string
  'severity': string
  'type': string
  'behavior': string
  'automation': string
  'status': string
  'is_flaky': string
  'layer': string
  'steps_type': string
  'steps_actions': string
  'steps_result': string
  'steps_data': string
  'milestone_id': string
  'milestone': string
  'suite_id': string
  'suite_parent_id': string
  'suite': string
  'suite_without_cases': string
  'parameters': string
  'is_muted': string
}

interface ParsedTestCase {
  title: string
  description: string | null
  test_type: TestType
  priority: Priority
  status: Status
  preconditions: string | null
  steps: Array<{ step_number: number; action: string; expected_result: string }> | null
  expected_result: string | null
  tags: string[] | null
  suite_name: string | null
}

interface ParsedSuite {
  id: string
  name: string
  parent_id: string | null
}

export function parseQaseCSV(csvText: string): {
  testCases: ParsedTestCase[]
  suites: ParsedSuite[]
  errors: string[]
} {
  // Parse CSV properly handling multi-line fields within quotes
  const rows = parseCSVRows(csvText)

  if (rows.length === 0) {
    return { testCases: [], suites: [], errors: ['CSV is empty'] }
  }

  const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ''))

  console.log('CSV Parse - Total rows:', rows.length)
  console.log('CSV Parse - Headers:', headers)
  console.log('CSV Parse - First few headers:', headers.slice(0, 10))

  const testCases: ParsedTestCase[] = []
  const suites: ParsedSuite[] = []
  const errors: string[] = []
  const suiteMap = new Map<string, ParsedSuite>()

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length === 0) continue

    try {
      const row = rows[i]
      const rowData: any = {}
      headers.forEach((header, index) => {
        rowData[header] = row[index] || ''
      })

      // Check if this is a suite-only row
      if (!rowData.title && rowData.suite) {
        const suite: ParsedSuite = {
          id: rowData.suite_id || `suite-${i}`,
          name: rowData.suite.replace(/^"|"$/g, ''),
          parent_id: rowData.suite_parent_id || null
        }
        if (!suiteMap.has(suite.id)) {
          suiteMap.set(suite.id, suite)
          suites.push(suite)
        }
        continue
      }

      // Skip if no title (invalid test case)
      if (!rowData.title) {
        if (i <= 3) {  // Log first few rows only
          console.log(`Row ${i} skipped - no title. rowData keys:`, Object.keys(rowData).slice(0, 10))
          console.log(`Row ${i} first values:`, Object.values(rowData).slice(0, 5))
        }
        continue
      }

      // Map Qase priority to our priority
      const priority = mapPriority(rowData.priority, rowData.severity)
      
      // Map Qase type to our test_type
      const test_type = mapTestType(rowData.type)
      
      // Map Qase status to our status
      const status = mapStatus(rowData.status)

      // Parse tags
      const tags = rowData.tags ? 
        rowData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : 
        null

      // Parse steps - try multiple formats
      let steps = null

      // Format 1: Qase format with steps_actions, steps_result
      if (rowData.steps_actions || rowData.steps_result) {
        steps = parseSteps(
          rowData.steps_actions,
          rowData.steps_result,
          rowData.steps_data
        )
      }

      // Format 2: Simple format with step_1_action, step_1_expected, etc
      if (!steps) {
        steps = parseSimpleSteps(rowData)
      }

      // Format 3: Single "steps" column with numbered list
      if (!steps && rowData.steps) {
        steps = parseNumberedSteps(rowData.steps)
      }

      // Get expected result from last step or description
      const expected_result = steps && steps.length > 0 ? 
        steps[steps.length - 1].expected_result : 
        null

      // Clean preconditions
      const preconditions = cleanText(rowData.preconditions)

      // Clean description
      const description = cleanText(rowData.description)

      // Get suite name
      const suite_name = rowData.suite ? rowData.suite.replace(/^"|"$/g, '') : null

      // Add suite to map if not exists
      if (suite_name && rowData.suite_id && !suiteMap.has(rowData.suite_id)) {
        const suite: ParsedSuite = {
          id: rowData.suite_id,
          name: suite_name,
          parent_id: rowData.suite_parent_id || null
        }
        suiteMap.set(rowData.suite_id, suite)
        suites.push(suite)
      }

      testCases.push({
        title: rowData.title.replace(/^"|"$/g, ''),
        description,
        test_type,
        priority,
        status,
        preconditions,
        steps,
        expected_result,
        tags,
        suite_name
      })

    } catch (error) {
      errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`)
    }
  }

  return { testCases, suites, errors }
}

function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote - add one quote and skip next
        currentField += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField)
      currentField = ''
    } else if (char === '\n' && !inQuotes) {
      // End of row
      currentRow.push(currentField)
      if (currentRow.length > 0 && currentRow.some(f => f.trim())) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
      // Windows line ending - skip \r, \n will be handled next iteration
      continue
    } else if (char === '\r' && !inQuotes) {
      // Mac line ending
      currentRow.push(currentField)
      if (currentRow.length > 0 && currentRow.some(f => f.trim())) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else {
      // Regular character
      currentField += char
    }
  }

  // Don't forget the last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.some(f => f.trim())) {
      rows.push(currentRow)
    }
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

function mapPriority(priority: string, severity: string): Priority {
  // Prioritize severity over priority if available
  const rawLevel = severity && severity !== 'undefined' ? severity : priority
  if (!rawLevel) return 'medium'

  const level = String(rawLevel).toLowerCase()

  if (!level || level === 'undefined' || level === 'null' || level === '') return 'medium'
  if (level.includes('blocker') || level.includes('critical')) return 'critical'
  if (level.includes('major') || level.includes('high')) return 'high'
  if (level.includes('minor') || level.includes('medium') || level.includes('normal')) return 'medium'
  if (level.includes('trivial') || level.includes('low')) return 'low'
  return 'medium'
}

function mapTestType(type: string): TestType {
  if (!type) return 'functional_web'

  const typeStr = String(type).toLowerCase()

  if (typeStr.includes('api')) return 'api'
  if (typeStr.includes('mobile')) return 'functional_mobile'
  return 'functional_web'
}

function mapStatus(status: string): Status {
  if (!status) return 'draft'

  const statusStr = String(status).toLowerCase()

  if (statusStr === 'actual' || statusStr === 'ready' || statusStr === 'approved') return 'ready'
  if (statusStr === 'deprecated' || statusStr === 'obsolete') return 'deprecated'
  return 'draft'
}

function parseSteps(
  actions: string,
  results: string,
  data: string
): Array<{ step_number: number; action: string; expected_result: string }> | null {
  if (!actions) return null

  // Split by numbered pattern: "1. ", "2. ", etc
  const actionPattern = /\d+\.\s+"([^"]+(?:""[^"]+)*)"/g
  const actionMatches = [...actions.matchAll(actionPattern)]

  const resultPattern = /\d+\.\s+"([^"]+(?:""[^"]+)*)"/g
  const resultMatches = results ? [...results.matchAll(resultPattern)] : []

  const dataPattern = /\d+\.\s+"([^"]+(?:""[^"]+)*)"/g
  const dataMatches = data ? [...data.matchAll(dataPattern)] : []

  const steps: Array<{ step_number: number; action: string; expected_result: string }> = []

  actionMatches.forEach((match, index) => {
    let action = match[1]
      .replace(/""/g, '"')  // Replace double quotes
      .replace(/\\"/g, '"')  // Replace escaped quotes
      .replace(/\\\\/g, '\\') // Replace escaped backslashes
      .trim()

    let expected = ''
    if (resultMatches[index]) {
      expected = resultMatches[index][1]
        .replace(/""/g, '"')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim()
    }

    let testData = ''
    if (dataMatches[index]) {
      testData = dataMatches[index][1]
        .replace(/""/g, '"')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim()
    }

    // Combine action with test data if available
    if (testData && testData !== '""' && testData.length > 0) {
      action = `${action}\n\n${testData}`
    }

    if (action) {
      steps.push({
        step_number: index + 1,
        action: action,
        expected_result: expected
      })
    }
  })

  return steps.length > 0 ? steps : null
}

function parseSimpleSteps(rowData: any): Array<{ step_number: number; action: string; expected_result: string }> | null {
  const steps: Array<{ step_number: number; action: string; expected_result: string }> = []

  // Look for step_1_action, step_2_action, etc.
  // Continue through all possible steps instead of breaking at first empty one
  for (let i = 1; i <= 20; i++) {
    const action = rowData[`step_${i}_action`]
    const expected = rowData[`step_${i}_expected`] || rowData[`step_${i}_result`] || ''

    if (action && action.trim()) {
      steps.push({
        step_number: i,
        action: cleanText(action) || action,
        expected_result: cleanText(expected) || expected
      })
    }
    // Continue to check all 20 possible steps, don't break on empty steps
  }

  return steps.length > 0 ? steps : null
}

function parseNumberedSteps(stepsText: string): Array<{ step_number: number; action: string; expected_result: string }> | null {
  if (!stepsText || !stepsText.trim()) return null

  const steps: Array<{ step_number: number; action: string; expected_result: string }> = []

  // Try to split by numbered patterns like "1. ", "2. ", "1) ", etc.
  const lines = stepsText.split(/\n/)
  let currentStep: { step_number: number; action: string; expected_result: string } | null = null
  let stepNumber = 0

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return

    // Check if line starts with number
    const match = trimmed.match(/^(\d+)[.)\s]+(.+)$/)
    if (match) {
      // Save previous step if exists
      if (currentStep) {
        steps.push(currentStep)
      }

      stepNumber = parseInt(match[1])
      currentStep = {
        step_number: stepNumber,
        action: match[2].trim(),
        expected_result: ''
      }
    } else if (currentStep) {
      // Continue current step
      currentStep.action += '\n' + trimmed
    }
  })

  // Don't forget the last step
  if (currentStep) {
    steps.push(currentStep)
  }

  return steps.length > 0 ? steps : null
}

function cleanText(text: string): string | null {
  if (!text) return null
  
  const cleaned = text
    .replace(/^"|"$/g, '')  // Remove surrounding quotes
    .replace(/""/g, '"')  // Replace double quotes with single
    .replace(/\\"/g, '"')  // Unescape quotes
    .replace(/\\\\/g, '\\')  // Unescape backslashes
    .replace(/\\n/g, '\n')  // Handle escaped newlines
    .replace(/^\d+\.\s+/gm, '• ')  // Convert numbered lists to bullets
    .trim()

  return cleaned || null
}

// Generate CSV template for download
export function generateCSVTemplate(): string {
  const headers = [
    'title',
    'description',
    'test_type',
    'priority',
    'status',
    'preconditions',
    'step_1_action',
    'step_1_expected',
    'step_2_action',
    'step_2_expected',
    'step_3_action',
    'step_3_expected',
    'tags',
    'suite_name'
  ]

  const examples = [
    [
      'Login with valid credentials',
      'Test successful login with valid email and password',
      'functional_web',
      'high',
      'ready',
      'User has valid account',
      'Navigate to login page',
      'Login page loads',
      'Enter email and password',
      'Credentials accepted',
      'Click login button',
      'User logged in successfully',
      'login,authentication,smoke',
      'Authentication Tests'
    ],
    [
      'GET /api/users - Verify user list',
      'Test API endpoint returns list of users',
      'api',
      'medium',
      'ready',
      'API is running',
      'Send GET request to /api/users',
      'Response status 200',
      'Verify response contains user array',
      'Array has valid user objects',
      '',
      '',
      'api,users,smoke',
      'API Tests'
    ]
  ]

  let csv = headers.join(',') + '\n'
  examples.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n'
  })

  return csv
}
