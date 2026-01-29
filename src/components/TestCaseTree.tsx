import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileCheck,
  Edit2,
  Trash2,
  Plus,
  FolderPlus,
  GripVertical,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TestType, Priority, Status } from '@/types/database'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TestCase {
  id: string
  test_case_code: string
  title: string
  test_type: TestType
  priority: Priority
  status: Status
  suite_id: string | null
  position: number
}

interface TestSuite {
  id: string
  name: string
  parent_id: string | null
  position: number
}

interface TreeNodeData {
  suite: TestSuite
  children: TreeNodeData[]
  testCases: TestCase[]
  isExpanded: boolean
}

type DragItemType = 'test-case' | 'suite' | 'multi-test-case'

interface DragItem {
  id: string
  type: DragItemType
  data: TestCase | TestSuite | TestCase[]
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
  // Drag-drop handlers
  onMoveTestCase?: (testCaseId: string, targetSuiteId: string | null, newPosition: number) => Promise<void>
  onMoveMultipleTestCases?: (testCaseIds: string[], targetSuiteId: string | null) => Promise<void>
  onMoveSuite?: (suiteId: string, targetParentId: string | null, newPosition: number) => Promise<void>
  onReorderTestCases?: (suiteId: string | null, orderedIds: string[]) => Promise<void>
  onReorderSuites?: (parentId: string | null, orderedIds: string[]) => Promise<void>
}

// Helper functions
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

// Sortable Test Case Item with checkbox
function SortableTestCaseItem({
  testCase,
  depth,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  onEdit,
  onDelete,
  showCheckbox,
  canDelete = false,
}: {
  testCase: TestCase
  depth: number
  isSelected: boolean
  isChecked: boolean
  onSelect: () => void
  onToggleCheck: () => void
  onEdit: () => void
  onDelete: () => void
  showCheckbox: boolean
  canDelete?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `case-${testCase.id}`,
    data: {
      type: 'test-case' as DragItemType,
      data: testCase,
      parentSuiteId: testCase.suite_id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer group transition-colors',
        isSelected && 'bg-primary-50 border-l-2 border-primary-500',
        isChecked && 'bg-blue-50',
        isDragging && 'shadow-lg bg-white z-50'
      )}
      onClick={onSelect}
    >
      {/* Checkbox for multi-select */}
      {showCheckbox && (
        <div
          onClick={(e) => {
            e.stopPropagation()
            onToggleCheck()
          }}
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors',
            isChecked
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 hover:border-blue-400'
          )}
          style={{ marginLeft: `${depth * 20 + 8}px` }}
        >
          {isChecked && <Check className="w-3 h-3" />}
        </div>
      )}

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing hover:text-primary-600 touch-none"
        style={!showCheckbox ? { paddingLeft: `${depth * 20 + 8}px` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

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
            onEdit()
          }}
          className="p-1 hover:bg-yellow-100 rounded transition-colors"
          title="Edit test case"
        >
          <Edit2 className="w-3.5 h-3.5 text-yellow-600" />
        </button>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Delete test case "${testCase.title}"?`)) {
                onDelete()
              }
            }}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            title="Delete test case"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
          </button>
        )}
      </div>
    </div>
  )
}

// Sortable Suite Node
function SortableSuiteNode({
  node,
  depth,
  selectedId,
  checkedIds,
  onToggleCheck,
  showCheckbox,
  canDelete = false,
  onToggleExpand,
  onSelectSuite,
  onSelectCase,
  onDeleteSuite,
  onDeleteCase,
  onEditSuite,
  onEditCase,
  onAddCaseToSuite,
  onAddSubSuite,
  isOverDropZone,
}: {
  node: TreeNodeData
  depth: number
  selectedId?: string | null
  checkedIds: Set<string>
  onToggleCheck: (id: string) => void
  showCheckbox: boolean
  canDelete?: boolean
  onToggleExpand: (suiteId: string) => void
  onSelectSuite: (suite: TestSuite) => void
  onSelectCase: (testCase: TestCase) => void
  onDeleteSuite: (suiteId: string) => void
  onDeleteCase: (caseId: string) => void
  onEditSuite: (suite: TestSuite) => void
  onEditCase: (testCase: TestCase) => void
  onAddCaseToSuite: (suiteId: string) => void
  onAddSubSuite: (parentId: string) => void
  isOverDropZone: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `suite-${node.suite.id}`,
    data: {
      type: 'suite' as DragItemType,
      data: node.suite,
      parentId: node.suite.parent_id,
    },
  })

  // Droppable zone for dropping items INTO this suite
  const { setNodeRef: setDropRef, isOver: isOverDrop } = useDroppable({
    id: `drop-into-${node.suite.id}`,
    data: {
      type: 'suite-drop-zone',
      suiteId: node.suite.id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const showDropIndicator = isOverDropZone || isOverDrop

  return (
    <div ref={setNodeRef} style={style} className="select-none">
      {/* Suite Header */}
      <div
        ref={setDropRef}
        className={cn(
          'flex items-center gap-2 px-2 py-2 hover:bg-gray-100 rounded group transition-colors',
          selectedId === node.suite.id && 'bg-primary-50',
          showDropIndicator && 'bg-blue-100 ring-2 ring-blue-400 ring-inset',
          isDragging && 'shadow-lg bg-white'
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing hover:text-primary-600 touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

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

        <Folder className={cn(
          "w-4 h-4 flex-shrink-0",
          showDropIndicator ? "text-blue-600" : "text-blue-500"
        )} />

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
          {canDelete && (
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
          )}
        </div>
      </div>

      {/* Children - Expanded State */}
      {node.isExpanded && (
        <div>
          {/* Child Suites */}
          <SortableContext
            items={node.children.map(child => `suite-${child.suite.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {node.children.map(childNode => (
              <SortableSuiteNode
                key={childNode.suite.id}
                node={childNode}
                depth={depth + 1}
                selectedId={selectedId}
                checkedIds={checkedIds}
                onToggleCheck={onToggleCheck}
                showCheckbox={showCheckbox}
                canDelete={canDelete}
                onToggleExpand={onToggleExpand}
                onSelectSuite={onSelectSuite}
                onSelectCase={onSelectCase}
                onDeleteSuite={onDeleteSuite}
                onDeleteCase={onDeleteCase}
                onEditSuite={onEditSuite}
                onEditCase={onEditCase}
                onAddCaseToSuite={onAddCaseToSuite}
                onAddSubSuite={onAddSubSuite}
                isOverDropZone={false}
              />
            ))}
          </SortableContext>

          {/* Test Cases */}
          <SortableContext
            items={node.testCases.map(tc => `case-${tc.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {node.testCases.map(testCase => (
              <SortableTestCaseItem
                key={testCase.id}
                testCase={testCase}
                depth={depth + 1}
                isSelected={selectedId === testCase.id}
                isChecked={checkedIds.has(testCase.id)}
                onToggleCheck={() => onToggleCheck(testCase.id)}
                showCheckbox={showCheckbox}
                canDelete={canDelete}
                onSelect={() => onSelectCase(testCase)}
                onEdit={() => onEditCase(testCase)}
                onDelete={() => onDeleteCase(testCase.id)}
              />
            ))}
          </SortableContext>

          {/* Empty state for suite */}
          {node.children.length === 0 && node.testCases.length === 0 && (
            <div
              className="text-xs text-gray-400 italic py-2"
              style={{ paddingLeft: `${(depth + 1) * 20 + 28}px` }}
            >
              No test cases yet - drag items here
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TestCaseTree({
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
  selectedId,
  onMoveTestCase,
  onMoveMultipleTestCases,
  onMoveSuite,
  onReorderTestCases,
  onReorderSuites,
}: TestCaseTreeProps) {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)
  const [overSuiteId, setOverSuiteId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Toggle checkbox for a test case
  const handleToggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Clear all selections
  const clearChecked = () => {
    setCheckedIds(new Set())
  }

  // Get all test cases from tree (flat list)
  const getAllTestCases = (): TestCase[] => {
    const cases: TestCase[] = []
    const traverse = (nodes: TreeNodeData[]) => {
      nodes.forEach(node => {
        cases.push(...node.testCases)
        traverse(node.children)
      })
    }
    traverse(treeData)
    return cases
  }

  // Get all suites from tree (flat list)
  const getAllSuites = (): TestSuite[] => {
    const suites: TestSuite[] = []
    const traverse = (nodes: TreeNodeData[]) => {
      nodes.forEach(node => {
        if (node.suite.id !== 'root') {
          suites.push(node.suite)
        }
        traverse(node.children)
      })
    }
    traverse(treeData)
    return suites
  }

  // Check if targetId is a descendant of suiteId (prevent circular reference)
  const isDescendant = (suiteId: string, targetId: string | null): boolean => {
    if (!targetId) return false
    const allSuites = getAllSuites()
    const findParents = (id: string): string[] => {
      const suite = allSuites.find(s => s.id === id)
      if (!suite || !suite.parent_id) return []
      return [suite.parent_id, ...findParents(suite.parent_id)]
    }
    return findParents(targetId).includes(suiteId)
  }

  // Get test cases for a specific suite
  const getTestCasesForSuite = (suiteId: string | null): TestCase[] => {
    if (suiteId === null) {
      // Uncategorized
      const rootNode = treeData.find(n => n.suite.id === 'root')
      return rootNode?.testCases || []
    }

    const findNode = (nodes: TreeNodeData[]): TreeNodeData | null => {
      for (const node of nodes) {
        if (node.suite.id === suiteId) return node
        const found = findNode(node.children)
        if (found) return found
      }
      return null
    }

    const node = findNode(treeData)
    return node?.testCases || []
  }

  // Get child suites for a parent
  const getChildSuites = (parentId: string | null): TestSuite[] => {
    if (parentId === null) {
      // Root level suites
      return treeData.filter(n => n.suite.id !== 'root').map(n => n.suite)
    }

    const findNode = (nodes: TreeNodeData[]): TreeNodeData | null => {
      for (const node of nodes) {
        if (node.suite.id === parentId) return node
        const found = findNode(node.children)
        if (found) return found
      }
      return null
    }

    const node = findNode(treeData)
    return node?.children.map(c => c.suite) || []
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current

    if (data?.type === 'test-case') {
      const testCase = data.data as TestCase

      // Check if this test case is part of checked items
      if (checkedIds.has(testCase.id) && checkedIds.size > 1) {
        // Multi-drag: get all checked test cases
        const allTestCases = getAllTestCases()
        const selectedTestCases = allTestCases.filter(tc => checkedIds.has(tc.id))
        setActiveItem({
          id: active.id as string,
          type: 'multi-test-case',
          data: selectedTestCases
        })
      } else {
        // Single drag
        setActiveItem({ id: active.id as string, type: 'test-case', data: testCase })
      }
    } else if (data?.type === 'suite') {
      setActiveItem({ id: active.id as string, type: 'suite', data: data.data })
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over?.data.current?.type === 'suite-drop-zone') {
      setOverSuiteId(over.data.current.suiteId)
    } else {
      setOverSuiteId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const currentActiveItem = activeItem
    setActiveItem(null)
    setOverSuiteId(null)

    if (!over) return

    const activeData = active.data.current
    const overData = over.data.current

    // Handle multi-select drag
    if (currentActiveItem?.type === 'multi-test-case' && overData?.type === 'suite-drop-zone') {
      const testCases = currentActiveItem.data as TestCase[]
      const targetSuiteId = overData.suiteId as string | null

      if (onMoveMultipleTestCases) {
        await onMoveMultipleTestCases(testCases.map(tc => tc.id), targetSuiteId)
        clearChecked()
      }
      return
    }

    // Case 1: Dropping test case into a suite drop zone
    if (activeData?.type === 'test-case' && overData?.type === 'suite-drop-zone') {
      const testCase = activeData.data as TestCase
      const targetSuiteId = overData.suiteId as string | null

      // Check if dragging a checked item (multi-drag)
      if (checkedIds.has(testCase.id) && checkedIds.size > 1 && onMoveMultipleTestCases) {
        await onMoveMultipleTestCases(Array.from(checkedIds), targetSuiteId)
        clearChecked()
        return
      }

      if (testCase.suite_id !== targetSuiteId && onMoveTestCase) {
        await onMoveTestCase(testCase.id, targetSuiteId, 0)
      }
      return
    }

    // Case 2: Reordering/moving test cases
    if (activeData?.type === 'test-case' && overData?.type === 'test-case') {
      const activeTestCase = activeData.data as TestCase
      const overTestCase = overData.data as TestCase
      const sourceSuiteId = activeData.parentSuiteId as string | null
      const targetSuiteId = overData.parentSuiteId as string | null

      if (sourceSuiteId === targetSuiteId) {
        // Reorder within same suite
        if (onReorderTestCases) {
          const testCases = getTestCasesForSuite(sourceSuiteId)
          const oldIndex = testCases.findIndex(tc => tc.id === activeTestCase.id)
          const newIndex = testCases.findIndex(tc => tc.id === overTestCase.id)

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newOrder = [...testCases]
            const [removed] = newOrder.splice(oldIndex, 1)
            newOrder.splice(newIndex, 0, removed)
            await onReorderTestCases(sourceSuiteId, newOrder.map(tc => tc.id))
          }
        }
      } else {
        // Move to different suite
        if (onMoveTestCase) {
          const targetTestCases = getTestCasesForSuite(targetSuiteId)
          const targetIndex = targetTestCases.findIndex(tc => tc.id === overTestCase.id)
          await onMoveTestCase(activeTestCase.id, targetSuiteId, targetIndex)
        }
      }
      return
    }

    // Case 3: Dropping suite into another suite's drop zone
    if (activeData?.type === 'suite' && overData?.type === 'suite-drop-zone') {
      const suite = activeData.data as TestSuite
      const targetParentId = overData.suiteId as string | null

      // Prevent dropping suite into itself or its descendants
      if (suite.id === targetParentId || isDescendant(suite.id, targetParentId)) {
        console.warn('Cannot move suite into itself or its descendants')
        return
      }

      if (suite.parent_id !== targetParentId && onMoveSuite) {
        await onMoveSuite(suite.id, targetParentId, 0)
      }
      return
    }

    // Case 4: Reordering/moving suites
    if (activeData?.type === 'suite' && overData?.type === 'suite') {
      const activeSuite = activeData.data as TestSuite
      const overSuite = overData.data as TestSuite
      const sourceParentId = activeData.parentId as string | null
      const targetParentId = overData.parentId as string | null

      if (sourceParentId === targetParentId) {
        // Reorder within same parent
        if (onReorderSuites) {
          const childSuites = getChildSuites(sourceParentId)
          const oldIndex = childSuites.findIndex(s => s.id === activeSuite.id)
          const newIndex = childSuites.findIndex(s => s.id === overSuite.id)

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newOrder = [...childSuites]
            const [removed] = newOrder.splice(oldIndex, 1)
            newOrder.splice(newIndex, 0, removed)
            await onReorderSuites(sourceParentId, newOrder.map(s => s.id))
          }
        }
      } else {
        // Move to different parent
        if (onMoveSuite) {
          // Prevent circular reference
          if (activeSuite.id === targetParentId || isDescendant(activeSuite.id, targetParentId)) {
            console.warn('Cannot move suite into itself or its descendants')
            return
          }

          const targetChildSuites = getChildSuites(targetParentId)
          const targetIndex = targetChildSuites.findIndex(s => s.id === overSuite.id)
          await onMoveSuite(activeSuite.id, targetParentId, targetIndex)
        }
      }
      return
    }
  }

  // Root level (no suite)
  const rootCases = treeData.find(n => n.suite.id === 'root')?.testCases || []
  const rootSuites = treeData.filter(n => n.suite.id !== 'root')

  // Droppable zone for uncategorized
  const { setNodeRef: setUncategorizedDropRef, isOver: isOverUncategorized } = useDroppable({
    id: 'drop-into-uncategorized',
    data: {
      type: 'suite-drop-zone',
      suiteId: null,
    },
  })

  const hasCheckedItems = checkedIds.size > 0

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Selection toolbar */}
      {hasCheckedItems && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">
            {checkedIds.size} test case{checkedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={clearChecked}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {/* Root Suites */}
        <SortableContext
          items={rootSuites.map(node => `suite-${node.suite.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {rootSuites.map(node => (
            <SortableSuiteNode
              key={node.suite.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              checkedIds={checkedIds}
              onToggleCheck={handleToggleCheck}
              showCheckbox={true}
              canDelete={canDelete}
              onToggleExpand={onToggleExpand}
              onSelectSuite={onSelectSuite}
              onSelectCase={onSelectCase}
              onDeleteSuite={onDeleteSuite}
              onDeleteCase={onDeleteCase}
              onEditSuite={onEditSuite}
              onEditCase={onEditCase}
              onAddCaseToSuite={onAddCaseToSuite}
              onAddSubSuite={onAddSubSuite}
              isOverDropZone={overSuiteId === node.suite.id}
            />
          ))}
        </SortableContext>

        {/* Root level test cases (Uncategorized) */}
        <div
          ref={setUncategorizedDropRef}
          className={cn(
            'mt-4 pt-4 border-t border-gray-200',
            isOverUncategorized && 'bg-blue-50 rounded-lg'
          )}
        >
          <div className={cn(
            'text-xs font-medium text-gray-500 px-2 mb-2 uppercase tracking-wide',
            isOverUncategorized && 'text-blue-600'
          )}>
            Uncategorized ({rootCases.length})
          </div>
          <SortableContext
            items={rootCases.map(tc => `case-${tc.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {rootCases.map(testCase => (
              <SortableTestCaseItem
                key={testCase.id}
                testCase={testCase}
                depth={0}
                isSelected={selectedId === testCase.id}
                isChecked={checkedIds.has(testCase.id)}
                onToggleCheck={() => handleToggleCheck(testCase.id)}
                showCheckbox={true}
                canDelete={canDelete}
                onSelect={() => onSelectCase(testCase)}
                onEdit={() => onEditCase(testCase)}
                onDelete={() => onDeleteCase(testCase.id)}
              />
            ))}
          </SortableContext>
          {rootCases.length === 0 && (
            <div className="text-xs text-gray-400 italic py-2 px-2">
              Drop test cases here to uncategorize them
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem?.type === 'test-case' && (
          <div className="p-2 bg-white shadow-lg rounded border-2 border-primary-400 opacity-90 max-w-xs">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium truncate">{(activeItem.data as TestCase).title}</span>
            </div>
          </div>
        )}
        {activeItem?.type === 'multi-test-case' && (
          <div className="p-2 bg-white shadow-lg rounded border-2 border-blue-500 opacity-90 max-w-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {(activeItem.data as TestCase[]).length}
              </div>
              <span className="text-sm font-medium">
                {(activeItem.data as TestCase[]).length} test cases
              </span>
            </div>
          </div>
        )}
        {activeItem?.type === 'suite' && (
          <div className="p-2 bg-white shadow-lg rounded border-2 border-blue-400 opacity-90 max-w-xs">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium truncate">{(activeItem.data as TestSuite).name}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
