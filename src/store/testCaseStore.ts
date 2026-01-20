import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type TestCase = Database['public']['Tables']['test_cases']['Row']
type TestSuite = Database['public']['Tables']['test_suites']['Row']

interface TestCaseState {
  // Data
  testCases: TestCase[]
  testSuites: TestSuite[]
  loading: boolean
  error: string | null

  // Cache
  lastFetch: number | null
  cacheTimeout: number // 5 minutes

  // Actions
  fetchTestCases: (projectId: string, forceRefresh?: boolean) => Promise<void>
  fetchTestSuites: (projectId: string, forceRefresh?: boolean) => Promise<void>
  addTestCase: (testCase: Omit<TestCase, 'id' | 'created_at' | 'updated_at'>) => Promise<{ error: any }>
  updateTestCase: (id: string, updates: Partial<TestCase>) => Promise<{ error: any }>
  deleteTestCase: (id: string) => Promise<{ error: any }>
  addTestSuite: (suite: Omit<TestSuite, 'id' | 'created_at' | 'updated_at'>) => Promise<{ error: any }>
  updateTestSuite: (id: string, updates: Partial<TestSuite>) => Promise<{ error: any }>
  deleteTestSuite: (id: string) => Promise<{ error: any }>
  clearCache: () => void
}

export const useTestCaseStore = create<TestCaseState>((set, get) => ({
  // Initial state
  testCases: [],
  testSuites: [],
  loading: false,
  error: null,
  lastFetch: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes

  // Fetch test cases with caching
  fetchTestCases: async (projectId: string, forceRefresh = false) => {
    const { lastFetch, cacheTimeout, testCases } = get()
    const now = Date.now()

    // Return cached data if available and not expired
    if (
      !forceRefresh &&
      lastFetch &&
      now - lastFetch < cacheTimeout &&
      testCases.length > 0
    ) {
      return
    }

    set({ loading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('project_id', projectId)
        .order('position')

      if (error) throw error

      set({
        testCases: data || [],
        loading: false,
        lastFetch: now,
      })
    } catch (error: any) {
      set({
        error: error.message,
        loading: false,
      })
    }
  },

  // Fetch test suites with caching
  fetchTestSuites: async (projectId: string, forceRefresh = false) => {
    const { lastFetch, cacheTimeout, testSuites } = get()
    const now = Date.now()

    if (
      !forceRefresh &&
      lastFetch &&
      now - lastFetch < cacheTimeout &&
      testSuites.length > 0
    ) {
      return
    }

    set({ loading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('test_suites')
        .select('*')
        .eq('project_id', projectId)
        .order('position')

      if (error) throw error

      set({
        testSuites: data || [],
        loading: false,
      })
    } catch (error: any) {
      set({
        error: error.message,
        loading: false,
      })
    }
  },

  // Add test case (optimistic update)
  addTestCase: async (testCase) => {
    const optimisticCase = {
      ...testCase,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as TestCase

    // Optimistic update
    set((state) => ({
      testCases: [...state.testCases, optimisticCase],
    }))

    try {
      const { data, error } = await supabase
        .from('test_cases')
        .insert([testCase])
        .select()
        .single()

      if (error) {
        // Revert on error
        set((state) => ({
          testCases: state.testCases.filter((tc) => tc.id !== optimisticCase.id),
        }))
        return { error }
      }

      // Replace optimistic with real data
      set((state) => ({
        testCases: state.testCases.map((tc) =>
          tc.id === optimisticCase.id ? data : tc
        ),
      }))

      return { error: null }
    } catch (error) {
      set((state) => ({
        testCases: state.testCases.filter((tc) => tc.id !== optimisticCase.id),
      }))
      return { error }
    }
  },

  // Update test case (optimistic update)
  updateTestCase: async (id, updates) => {
    // Store old state for rollback
    const oldTestCases = get().testCases

    // Optimistic update
    set((state) => ({
      testCases: state.testCases.map((tc) =>
        tc.id === id ? { ...tc, ...updates } : tc
      ),
    }))

    try {
      const { error } = await supabase
        .from('test_cases')
        .update(updates)
        .eq('id', id)

      if (error) {
        // Revert on error
        set({ testCases: oldTestCases })
        return { error }
      }

      return { error: null }
    } catch (error) {
      set({ testCases: oldTestCases })
      return { error }
    }
  },

  // Delete test case (optimistic update)
  deleteTestCase: async (id) => {
    const oldTestCases = get().testCases

    // Optimistic update
    set((state) => ({
      testCases: state.testCases.filter((tc) => tc.id !== id),
    }))

    try {
      const { error } = await supabase.from('test_cases').delete().eq('id', id)

      if (error) {
        // Revert on error
        set({ testCases: oldTestCases })
        return { error }
      }

      return { error: null }
    } catch (error) {
      set({ testCases: oldTestCases })
      return { error }
    }
  },

  // Add test suite
  addTestSuite: async (suite) => {
    const optimisticSuite = {
      ...suite,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as TestSuite

    set((state) => ({
      testSuites: [...state.testSuites, optimisticSuite],
    }))

    try {
      const { data, error } = await supabase
        .from('test_suites')
        .insert([suite])
        .select()
        .single()

      if (error) {
        set((state) => ({
          testSuites: state.testSuites.filter((ts) => ts.id !== optimisticSuite.id),
        }))
        return { error }
      }

      set((state) => ({
        testSuites: state.testSuites.map((ts) =>
          ts.id === optimisticSuite.id ? data : ts
        ),
      }))

      return { error: null }
    } catch (error) {
      set((state) => ({
        testSuites: state.testSuites.filter((ts) => ts.id !== optimisticSuite.id),
      }))
      return { error }
    }
  },

  // Update test suite
  updateTestSuite: async (id, updates) => {
    const oldTestSuites = get().testSuites

    set((state) => ({
      testSuites: state.testSuites.map((ts) =>
        ts.id === id ? { ...ts, ...updates } : ts
      ),
    }))

    try {
      const { error } = await supabase
        .from('test_suites')
        .update(updates)
        .eq('id', id)

      if (error) {
        set({ testSuites: oldTestSuites })
        return { error }
      }

      return { error: null }
    } catch (error) {
      set({ testSuites: oldTestSuites })
      return { error }
    }
  },

  // Delete test suite
  deleteTestSuite: async (id) => {
    const oldTestSuites = get().testSuites

    set((state) => ({
      testSuites: state.testSuites.filter((ts) => ts.id !== id),
    }))

    try {
      const { error } = await supabase.from('test_suites').delete().eq('id', id)

      if (error) {
        set({ testSuites: oldTestSuites })
        return { error }
      }

      return { error: null }
    } catch (error) {
      set({ testSuites: oldTestSuites })
      return { error }
    }
  },

  // Clear cache
  clearCache: () => {
    set({ lastFetch: null })
  },
}))

// Selectors for optimized component subscriptions
export const selectTestCases = (state: TestCaseState) => state.testCases
export const selectTestSuites = (state: TestCaseState) => state.testSuites
export const selectLoading = (state: TestCaseState) => state.loading
export const selectError = (state: TestCaseState) => state.error
