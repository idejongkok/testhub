import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FileCheck, 
  Edit2,
  Trash2,
  Plus,
  FolderPlus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TestType, Priority, Status } from '@/types/database'

interface TestCase {
  id: string
  test_case_code: string
  title: string
  test_type: TestType
  priority: Priority
  status: Status
  suite_id: string | null
}

interface TestSuite {
  id: string
  name: string
  parent_id: string | null
}

interface TreeNodeData {
  suite: TestSuite
  children: TreeNodeData[]
  testCases: TestCase[]
  isExpanded: boolean
}

interface TestCaseTreeProps {
  treeData: TreeNodeData[]
  onToggleExpand: (suiteId: string) => void
  onSelectCase: (testCase: TestCase) => void
  onSelectSuite: (suite: TestSuite) => void
  onDeleteCase: (caseId: string) => void
  onDeleteSuite: (suiteId: string) => void
  onEditCase: (testCase: TestCase) => void
  onEditSuite: (suite: TestSuite) => void
  onAddCaseToSuite: (suiteId: string) => void
  onAddSubSuite: (parentId: string) => void
  selectedId?: string | null
}

export default function TestCaseTree({
  treeData,
  onToggleExpand,
  onSelectCase,
  onSelectSuite,
  onDeleteCase,
  onDeleteSuite,
  onEditCase,
  onEditSuite,
  onAddCaseToSuite,
  onAddSubSuite,
  selectedId
}: TestCaseTreeProps) {

  const getTypeColor = (type: TestType) => {
    switch (type) {
      case 'api': return 'bg-purple-100 text-purple-700'
      case 'functional_mobile': return 'bg-green-100 text-green-700'
      default: return 'bg-blue-100 text-blue-700'
    }
  }

  const getTypeLabel = (type: TestType) => {
    switch (type) {
      case 'api': return 'API'
      case 'functional_mobile': return 'Mobile'
      default: return 'Web'
    }
  }

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-700'
      case 'deprecated': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const renderSuiteNode = (node: TreeNodeData, depth: number = 0) => {
    return (
      <div key={node.suite.id} className="select-none">
        {/* Suite Header */}
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-2 hover:bg-gray-100 rounded group transition-colors',
            selectedId === node.suite.id && 'bg-primary-50'
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          <button
            onClick={() => onToggleExpand(node.suite.id)}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
          >
            {node.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
          
          <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
          
          <span
            onClick={() => onSelectSuite(node.suite)}
            className="flex-1 text-sm font-medium text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
          >
            {node.suite.name}
          </span>
          
          <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
            {node.testCases.length}
          </span>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddCaseToSuite(node.suite.id)
              }}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
              title="Add test case"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddSubSuite(node.suite.id)
              }}
              className="p-1 hover:bg-green-100 rounded transition-colors"
              title="Add sub-suite"
            >
              <FolderPlus className="w-3.5 h-3.5 text-green-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEditSuite(node.suite)
              }}
              className="p-1 hover:bg-yellow-100 rounded transition-colors"
              title="Edit suite"
            >
              <Edit2 className="w-3.5 h-3.5 text-yellow-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete suite "${node.suite.name}"? Test cases will be moved to Uncategorized.`)) {
                  onDeleteSuite(node.suite.id)
                }
              }}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Delete suite"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
            </button>
          </div>
        </div>

        {/* Children - Expanded State */}
        {node.isExpanded && (
          <div>
            {/* Child Suites */}
            {node.children.map(childNode => renderSuiteNode(childNode, depth + 1))}
            
            {/* Test Cases */}
            {node.testCases.map(testCase => (
              <div
                key={testCase.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer group transition-colors',
                  selectedId === testCase.id && 'bg-primary-50 border-l-2 border-primary-500'
                )}
                style={{ paddingLeft: `${(depth + 1) * 20 + 28}px` }}
                onClick={() => onSelectCase(testCase)}
              >
                <FileCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${getTypeColor(testCase.test_type)}`}>
                  {getTypeLabel(testCase.test_type)}
                </span>

                <span className={`px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${getStatusColor(testCase.status)}`}>
                  {testCase.status}
                </span>

                <span className="flex-1 text-sm text-gray-700 truncate flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {testCase.test_case_code}
                  </span>
                  {testCase.title}
                </span>
                
                <span className={`text-xs flex-shrink-0 ${getPriorityColor(testCase.priority)}`}>
                  ●
                </span>

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditCase(testCase)
                    }}
                    className="p-1 hover:bg-yellow-100 rounded transition-colors"
                    title="Edit test case"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-yellow-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete test case "${testCase.title}"?`)) {
                        onDeleteCase(testCase.id)
                      }
                    }}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Delete test case"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            ))}

            {/* Empty state for suite */}
            {node.children.length === 0 && node.testCases.length === 0 && (
              <div 
                className="text-xs text-gray-400 italic py-2"
                style={{ paddingLeft: `${(depth + 1) * 20 + 28}px` }}
              >
                No test cases yet
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Root level (no suite)
  const rootCases = treeData.find(n => n.suite.id === 'root')?.testCases || []

  return (
    <div className="space-y-0.5">
      {treeData.map(node => node.suite.id !== 'root' && renderSuiteNode(node))}
      
      {/* Root level test cases (Uncategorized) */}
      {rootCases.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 px-2 mb-2 uppercase tracking-wide">
            Uncategorized ({rootCases.length})
          </div>
          {rootCases.map(testCase => (
            <div
              key={testCase.id}
              className={cn(
                'flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer group transition-colors',
                selectedId === testCase.id && 'bg-primary-50 border-l-2 border-primary-500'
              )}
              style={{ paddingLeft: '28px' }}
              onClick={() => onSelectCase(testCase)}
            >
              <FileCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
              
              <span className={`px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${getTypeColor(testCase.test_type)}`}>
                {getTypeLabel(testCase.test_type)}
              </span>

              <span className={`px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${getStatusColor(testCase.status)}`}>
                {testCase.status}
              </span>
              
              <span className="flex-1 text-sm text-gray-700 truncate">
                {testCase.title}
              </span>
              
              <span className={`text-xs flex-shrink-0 ${getPriorityColor(testCase.priority)}`}>
                ●
              </span>

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditCase(testCase)
                  }}
                  className="p-1 hover:bg-yellow-100 rounded transition-colors"
                  title="Edit test case"
                >
                  <Edit2 className="w-3.5 h-3.5 text-yellow-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete test case "${testCase.title}"?`)) {
                      onDeleteCase(testCase.id)
                    }
                  }}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Delete test case"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
