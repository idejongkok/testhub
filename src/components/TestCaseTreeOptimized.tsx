import { memo } from 'react'
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
  canDelete?: boolean
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

// Memoized test case item to prevent unnecessary re-renders
const TestCaseItem = memo(({
  testCase,
  onSelect,
  onEdit,
  onDelete,
  isSelected,
  depth,
  canDelete = false
}: {
  testCase: TestCase
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  isSelected: boolean
  depth: number
  canDelete?: boolean
}) => {
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

  return (
    <div
      style={{ paddingLeft: `${depth * 24 + 40}px` }}
      className={cn(
        'group flex items-center justify-between py-2 px-3 hover:bg-gray-50 cursor-pointer border-l-2',
        isSelected ? 'bg-primary-50 border-primary-500' : 'border-transparent'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm truncate">{testCase.title}</span>
        <span className={cn('text-xs px-2 py-0.5 rounded-full flex-shrink-0', getTypeColor(testCase.test_type))}>
          {getTypeLabel(testCase.test_type)}
        </span>
        <span className={cn('text-xs font-medium flex-shrink-0', getPriorityColor(testCase.priority))}>
          {testCase.priority.toUpperCase()}
        </span>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <Edit2 className="w-3 h-3 text-gray-600" />
        </button>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Delete this test case?')) onDelete()
            }}
            className="p-1 hover:bg-red-100 rounded"
          >
            <Trash2 className="w-3 h-3 text-red-600" />
          </button>
        )}
      </div>
    </div>
  )
})

TestCaseItem.displayName = 'TestCaseItem'

// Memoized suite node to prevent unnecessary re-renders
const SuiteNode = memo(({
  node,
  depth,
  canDelete = false,
  onToggleExpand,
  onSelectSuite,
  onEditSuite,
  onDeleteSuite,
  onAddCase,
  onAddSubSuite,
  onSelectCase,
  onEditCase,
  onDeleteCase,
  selectedId
}: {
  node: TreeNodeData
  depth: number
  canDelete?: boolean
  onToggleExpand: (id: string) => void
  onSelectSuite: (suite: TestSuite) => void
  onEditSuite: (suite: TestSuite) => void
  onDeleteSuite: (id: string) => void
  onAddCase: (suiteId: string) => void
  onAddSubSuite: (parentId: string) => void
  onSelectCase: (testCase: TestCase) => void
  onEditCase: (testCase: TestCase) => void
  onDeleteCase: (id: string) => void
  selectedId?: string | null
}) => {
  return (
    <div>
      {/* Suite Header */}
      <div
        style={{ paddingLeft: `${depth * 24}px` }}
        className="group flex items-center justify-between py-2 px-3 hover:bg-gray-100 cursor-pointer"
        onClick={() => onSelectSuite(node.suite)}
      >
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.suite.id)
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {node.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <Folder className="w-4 h-4 text-primary-600" />
          <span className="font-medium text-sm">{node.suite.name}</span>
          <span className="text-xs text-gray-500">
            ({node.testCases.length})
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddCase(node.suite.id)
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="Add test case"
          >
            <Plus className="w-3 h-3 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddSubSuite(node.suite.id)
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="Add sub-suite"
          >
            <FolderPlus className="w-3 h-3 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditSuite(node.suite)
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Edit2 className="w-3 h-3 text-gray-600" />
          </button>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Delete this suite and all its contents?')) {
                  onDeleteSuite(node.suite.id)
                }
              }}
              className="p-1 hover:bg-red-100 rounded"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
            </button>
          )}
        </div>
      </div>

      {/* Children (test cases and sub-suites) */}
      {node.isExpanded && (
        <div>
          {/* Test cases */}
          {node.testCases.map((testCase) => (
            <TestCaseItem
              key={testCase.id}
              testCase={testCase}
              onSelect={() => onSelectCase(testCase)}
              onEdit={() => onEditCase(testCase)}
              onDelete={() => onDeleteCase(testCase.id)}
              isSelected={selectedId === testCase.id}
              depth={depth}
              canDelete={canDelete}
            />
          ))}

          {/* Sub-suites */}
          {node.children.map((child) => (
            <SuiteNode
              key={child.suite.id}
              node={child}
              depth={depth + 1}
              canDelete={canDelete}
              onToggleExpand={onToggleExpand}
              onSelectSuite={onSelectSuite}
              onEditSuite={onEditSuite}
              onDeleteSuite={onDeleteSuite}
              onAddCase={onAddCase}
              onAddSubSuite={onAddSubSuite}
              onSelectCase={onSelectCase}
              onEditCase={onEditCase}
              onDeleteCase={onDeleteCase}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
})

SuiteNode.displayName = 'SuiteNode'

// Main component with memo
const TestCaseTreeOptimized = memo(({
  treeData,
  canDelete = false,
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
}: TestCaseTreeProps) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {treeData.map((node) => (
        <SuiteNode
          key={node.suite.id}
          node={node}
          depth={0}
          canDelete={canDelete}
          onToggleExpand={onToggleExpand}
          onSelectSuite={onSelectSuite}
          onEditSuite={onEditSuite}
          onDeleteSuite={onDeleteSuite}
          onAddCase={onAddCaseToSuite}
          onAddSubSuite={onAddSubSuite}
          onSelectCase={onSelectCase}
          onEditCase={onEditCase}
          onDeleteCase={onDeleteCase}
          selectedId={selectedId}
        />
      ))}
    </div>
  )
})

TestCaseTreeOptimized.displayName = 'TestCaseTreeOptimized'

export default TestCaseTreeOptimized
