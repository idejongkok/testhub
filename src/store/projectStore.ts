import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  fetchProjects: () => Promise<void>
  setCurrentProject: (project: Project | null) => void
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<{ error: any }>
  updateProject: (id: string, updates: Partial<Project>) => Promise<{ error: any }>
  deleteProject: (id: string) => Promise<{ error: any }>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ projects: data })

      // Don't auto-select project here - let ProjectRoute handle it based on URL
      // This prevents conflicts between localStorage and URL-based routing
    }
    set({ loading: false })
  },

  setCurrentProject: (project) => {
    set({ currentProject: project })
    if (project) {
      localStorage.setItem('currentProjectId', project.id)
    } else {
      localStorage.removeItem('currentProjectId')
    }
  },

  createProject: async (project) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...project, created_by: user?.id }])
      .select()
      .single()

    if (!error && data) {
      set((state) => ({
        projects: [data, ...state.projects],
        currentProject: data,
      }))
    }
    return { error }
  },

  updateProject: async (id, updates) => {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? data : p)),
        currentProject: state.currentProject?.id === id ? data : state.currentProject,
      }))
    }
    return { error }
  },

  deleteProject: async (id) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (!error) {
      const { currentProject } = get()
      const isCurrentProject = currentProject?.id === id

      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: isCurrentProject ? null : state.currentProject,
      }))

      // Clear localStorage if deleted project was the current one
      if (isCurrentProject) {
        localStorage.removeItem('currentProjectId')
      }
    }
    return { error }
  },
}))
