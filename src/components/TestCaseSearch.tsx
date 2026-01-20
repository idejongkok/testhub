import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from './ui/Input'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Database, TestType, Priority, Status } from '@/types/database'

type TestCase = Database['public']['Tables']['test_cases']['Row']

interface TestCaseSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedType: TestType | 'all'
  onTypeChange: (type: TestType | 'all') => void
  selectedPriority: Priority | 'all'
  onPriorityChange: (priority: Priority | 'all') => void
  selectedStatus: Status | 'all'
  onStatusChange: (status: Status | 'all') => void
}

export default function TestCaseSearch({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedPriority,
  onPriorityChange,
  selectedStatus,
  onStatusChange,
}: TestCaseSearchProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search test cases..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value as TestType | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        >
          <option value="all">All Types</option>
          <option value="functional_web">Web Functional</option>
          <option value="functional_mobile">Mobile Functional</option>
          <option value="api">API Testing</option>
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => onPriorityChange(e.target.value as Priority | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as Status | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        >
          <option value="all">All Status</option>
          <option value="ready">Ready</option>
          <option value="draft">Draft</option>
          <option value="deprecated">Deprecated</option>
        </select>
      </div>
    </div>
  )
}

/**
 * Custom hook for filtering test cases with debounced search
 */
export function useFilteredTestCases(
  testCases: TestCase[],
  searchQuery: string,
  selectedType: TestType | 'all',
  selectedPriority: Priority | 'all',
  selectedStatus: Status | 'all'
) {
  const debouncedSearch = useDebounce(searchQuery, 300)

  const filteredCases = useMemo(() => {
    return testCases.filter((testCase) => {
      // Search filter (debounced)
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase()
        const matchesSearch =
          testCase.title.toLowerCase().includes(query) ||
          testCase.description?.toLowerCase().includes(query) ||
          testCase.tags?.some((tag) => tag.toLowerCase().includes(query))

        if (!matchesSearch) return false
      }

      // Type filter
      if (selectedType !== 'all' && testCase.test_type !== selectedType) {
        return false
      }

      // Priority filter
      if (selectedPriority !== 'all' && testCase.priority !== selectedPriority) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'all' && testCase.status !== selectedStatus) {
        return false
      }

      return true
    })
  }, [testCases, debouncedSearch, selectedType, selectedPriority, selectedStatus])

  return filteredCases
}
