import { useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'

interface ProjectRouteProps {
  children: React.ReactNode
}

/**
 * Wrapper component that ensures a project is selected and syncs with URL
 * Usage: Wrap pages that require a project context
 */
export default function ProjectRoute({ children }: ProjectRouteProps) {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentProject, projects, loading, setCurrentProject } = useProjectStore()

  useEffect(() => {
    // Wait for projects to load
    if (loading || projects.length === 0) return

    // URL has projectId - this is the source of truth
    if (projectId) {
      const projectFromUrl = projects.find(p => p.id === projectId)

      if (projectFromUrl) {
        // Project exists in URL - sync store if different
        if (currentProject?.id !== projectId) {
          setCurrentProject(projectFromUrl)
        }
      } else {
        // Invalid project ID in URL - redirect to first available project
        const targetProject = projects[0]
        if (targetProject) {
          const newPath = window.location.pathname.replace(
            `/projects/${projectId}`,
            `/projects/${targetProject.id}`
          )
          navigate(newPath, { replace: true })
        }
      }
    } else {
      // No projectId in URL - need to add one
      const savedProjectId = localStorage.getItem('currentProjectId')
      const savedProject = savedProjectId ? projects.find(p => p.id === savedProjectId) : null
      const targetProject = savedProject || currentProject || projects[0]

      if (targetProject) {
        const currentPath = window.location.pathname
        const newPath = `/projects/${targetProject.id}${currentPath}`
        navigate(newPath, { replace: true })
      }
    }
  }, [projectId, projects, loading, navigate, setCurrentProject, currentProject?.id])

  // Show loading while fetching projects
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  // No projects available
  if (projects.length === 0) {
    return <Navigate to="/dashboard" replace />
  }

  // No projectId in URL yet - wait for redirect
  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up project...</p>
        </div>
      </div>
    )
  }

  // Check if projectId is valid
  const projectFromUrl = projects.find(p => p.id === projectId)
  if (!projectFromUrl) {
    // Invalid project - wait for redirect
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Valid projectId in URL - render immediately
  // useEffect will sync the store in background
  return <>{children}</>
}
