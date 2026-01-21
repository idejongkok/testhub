# ⚡ Performance Optimization Checklist

## Quick Reference Guide for Using Performance Features

---

## 🎯 New Components & Hooks

### 1. Pagination Hook
```typescript
import { usePagination } from '@/lib/hooks/usePagination'

// In your component
const {
  paginatedItems,      // Items for current page
  currentPage,         // Current page number
  totalPages,          // Total number of pages
  nextPage,            // Go to next page
  previousPage,        // Go to previous page
  goToPage,            // Go to specific page
} = usePagination(allItems, { pageSize: 50 })
```

### 2. Debounce Hook
```typescript
import { useDebounce } from '@/lib/hooks/useDebounce'

const [searchQuery, setSearchQuery] = useState('')
const debouncedSearch = useDebounce(searchQuery, 300) // 300ms delay

// Use debouncedSearch for filtering
useEffect(() => {
  filterItems(debouncedSearch)
}, [debouncedSearch])
```

### 3. Filtered Test Cases Hook
```typescript
import { useFilteredTestCases } from '@/components/TestCaseSearch'

const filteredCases = useFilteredTestCases(
  testCases,
  searchQuery,
  selectedType,
  selectedPriority,
  selectedStatus
)
```

### 4. Pagination Component
```typescript
import { Pagination } from '@/components/ui/Pagination'

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  startIndex={startIndex}
  endIndex={endIndex}
  onPageChange={goToPage}
  onNext={nextPage}
  onPrevious={previousPage}
  onFirst={goToFirstPage}
  onLast={goToLastPage}
/>
```

---

## 🏪 Optimized Store Usage

### testCaseStore (New!)
```typescript
import { useTestCaseStore } from '@/store/testCaseStore'

function MyComponent() {
  // Selective subscriptions (only re-renders when specific data changes)
  const testCases = useTestCaseStore(state => state.testCases)
  const loading = useTestCaseStore(state => state.loading)

  // Actions
  const fetchTestCases = useTestCaseStore(state => state.fetchTestCases)
  const addTestCase = useTestCaseStore(state => state.addTestCase)

  useEffect(() => {
    // Automatically uses cache if available
    fetchTestCases(projectId)
  }, [projectId])

  // Optimistic update - instant UI feedback
  const handleCreate = async () => {
    await addTestCase(newTestCase) // UI updates immediately
  }
}
```

---

## 🔧 Performance Utilities

### Measure Async Operations
```typescript
import { measureAsync } from '@/lib/performance'

const data = await measureAsync('fetchTestCases', async () => {
  return await supabase.from('test_cases').select('*')
})
// Logs: [Performance] fetchTestCases took 342.50ms
```

### Debounce Function
```typescript
import { debounce } from '@/lib/performance'

const handleSearch = debounce((query: string) => {
  // This runs 300ms after last call
  performSearch(query)
}, 300)
```

### Throttle Function
```typescript
import { throttle } from '@/lib/performance'

const handleScroll = throttle(() => {
  // This runs at most once every 100ms
  updateScrollPosition()
}, 100)
```

---

## 📝 Component Optimization Patterns

### 1. Use React.memo for Leaf Components
```typescript
import { memo } from 'react'

const TestCaseItem = memo(({ testCase, onClick }) => {
  return <div onClick={onClick}>{testCase.title}</div>
})

TestCaseItem.displayName = 'TestCaseItem'
```

### 2. Use useCallback for Event Handlers
```typescript
import { useCallback } from 'react'

const handleClick = useCallback((id: string) => {
  doSomething(id)
}, []) // Only recreated if dependencies change
```

### 3. Use useMemo for Expensive Computations
```typescript
import { useMemo } from 'react'

const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.priority - b.priority)
}, [items]) // Only recomputes if items change
```

---

## 🎨 Optimized Components to Use

### Use These Instead of Original:
- ✅ `TestCaseTreeOptimized.tsx` instead of `TestCaseTree.tsx`
- ✅ `TestCaseSearch.tsx` for search with filters
- ✅ `Pagination.tsx` for paginated lists
- ✅ All UI components (`Button`, `Card`, etc.) are already optimized

---

## 🚦 Performance Dos and Don'ts

### ✅ DO:
- Use pagination for lists > 50 items
- Debounce search inputs (300ms recommended)
- Use `React.memo()` for components that render frequently
- Use selective Zustand subscriptions
- Cache API responses when appropriate
- Use optimistic updates for instant UX

### ❌ DON'T:
- Load all data at once without pagination
- Create inline functions in render (use `useCallback`)
- Do expensive computations in render (use `useMemo`)
- Forget to add dependencies to hooks
- Skip error handling in optimistic updates
- Cache data indefinitely (use 5-minute timeout)

---

## 🧪 Testing Performance

### Chrome DevTools Performance Tab
1. Open DevTools (F12)
2. Go to "Performance" tab
3. Click Record (red dot)
4. Interact with your component
5. Stop recording
6. Analyze the flamegraph

### React DevTools Profiler
1. Install React DevTools extension
2. Open DevTools
3. Go to "Profiler" tab
4. Click "Record"
5. Interact with your component
6. Click "Stop"
7. Review render times

### Measure Memory Usage
```typescript
import { logMemoryUsage } from '@/lib/performance'

// Log current memory usage
logMemoryUsage()
```

---

## 📋 Common Performance Issues & Solutions

### Issue: Slow typing in search input
**Solution:** Use debounce hook
```typescript
const debouncedQuery = useDebounce(searchQuery, 300)
```

### Issue: Lag when scrolling long lists
**Solution:** Add pagination
```typescript
const { paginatedItems } = usePagination(items, { pageSize: 50 })
```

### Issue: Whole tree re-renders on any change
**Solution:** Use optimized tree component
```typescript
import TestCaseTreeOptimized from '@/components/TestCaseTreeOptimized'
```

### Issue: Multiple API calls for same data
**Solution:** Use testCaseStore with caching
```typescript
const fetchTestCases = useTestCaseStore(state => state.fetchTestCases)
await fetchTestCases(projectId) // Uses cache if available
```

### Issue: Laggy button clicks
**Solution:** Use optimistic updates
```typescript
await addTestCase(newCase) // UI updates instantly
```

---

## 🎯 Performance Goals

### Target Metrics:
- **Initial Load**: < 1s on 3G
- **Time to Interactive**: < 2s
- **First Input Delay**: < 100ms
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

### Bundle Size Goals:
- **Initial JS Bundle**: < 150KB gzipped
- **Total Page Weight**: < 500KB
- **Per-Route Bundles**: < 50KB each

---

## 🔄 Migration Guide

### Migrating to Optimized Components

1. **Replace TestCaseTree:**
```diff
- import TestCaseTree from '@/components/TestCaseTree'
+ import TestCaseTreeOptimized from '@/components/TestCaseTreeOptimized'
```

2. **Add Pagination:**
```typescript
// Add at top of component
const { paginatedItems, ...pagination } = usePagination(testCases, {
  pageSize: 50
})

// Use paginatedItems instead of testCases
{paginatedItems.map(tc => <TestCaseItem key={tc.id} {...tc} />)}

// Add pagination UI at bottom
<Pagination {...pagination} />
```

3. **Add Search with Debounce:**
```typescript
const [searchQuery, setSearchQuery] = useState('')
const debouncedSearch = useDebounce(searchQuery, 300)

const filteredCases = useMemo(() => {
  return testCases.filter(tc =>
    tc.title.toLowerCase().includes(debouncedSearch.toLowerCase())
  )
}, [testCases, debouncedSearch])
```

---

## 📊 Monitoring Checklist

Before deploying to production, verify:

- [ ] All large lists use pagination
- [ ] Search inputs are debounced
- [ ] Heavy components use `React.memo()`
- [ ] Event handlers use `useCallback()`
- [ ] Expensive computations use `useMemo()`
- [ ] API responses are cached appropriately
- [ ] Images are optimized and lazy-loaded
- [ ] Code splitting is working (check Network tab)
- [ ] No console errors or warnings
- [ ] Performance metrics meet targets

---

**Quick Tip:** When in doubt, measure first, then optimize!

Use Chrome DevTools Performance tab to identify actual bottlenecks before applying optimizations.
