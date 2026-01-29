import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserRole } from '@/types/database'

interface AuthState {
  user: User | null
  userRole: UserRole
  loading: boolean
  setUser: (user: User | null) => void
  setUserRole: (role: UserRole) => void
  setLoading: (loading: boolean) => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  fetchUserRole: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userRole: 'user',
  loading: true,

  setUser: (user) => set({ user }),
  setUserRole: (role) => set({ userRole: role }),
  setLoading: (loading) => set({ loading }),

  fetchUserRole: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single()

      // If error or no data, default to 'user' (no admin permissions)
      if (error || !data) {
        console.warn('Failed to fetch user role, defaulting to user:', error?.message)
        set({ userRole: 'user' })
        return
      }

      // Only set as administrator if explicitly set, otherwise default to user
      if (data.role === 'administrator') {
        set({ userRole: 'administrator' })
      } else {
        set({ userRole: 'user' })
      }
    } catch (err) {
      console.error('Error fetching user role:', err)
      set({ userRole: 'user' })
    }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (data.user) {
      set({ user: data.user })
      // Fetch user role after sign in
      await get().fetchUserRole(data.user.id)
    }
    return { error }
  },

  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://testhub-rr.pages.dev/login',
      },
    })
    if (data.user) {
      set({ user: data.user })
    }
    return { error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, userRole: 'user' })
    // Clear all stored data on logout
    localStorage.removeItem('currentProjectId')
  },

  initialize: async () => {
    set({ loading: true })
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      set({ user: session.user })
      await get().fetchUserRole(session.user.id)
    } else {
      set({ user: null })
    }

    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        await get().fetchUserRole(session.user.id)
      } else {
        set({ user: null, userRole: 'user' })
      }
    })
  },
}))
