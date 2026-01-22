import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import ProjectRoute from '@/components/ProjectRoute'

// Lazy load pages for better performance
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TestCasesPageWithTree = lazy(() => import('@/pages/TestCasesPageWithTree'))
const TestPlansPage = lazy(() => import('@/pages/TestPlansPage'))
const TestRunsPage = lazy(() => import('@/pages/TestRunsPage'))
const TestRunReport = lazy(() => import('@/pages/TestRunReport'))
const TestRunReportPublic = lazy(() => import('@/pages/TestRunReportPublic'))
const BugsPage = lazy(() => import('@/pages/BugsPage'))

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

function App() {
  const { initialize } = useAuthStore()
  const { fetchProjects } = useProjectStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const { user } = useAuthStore.getState()
    if (user) {
      fetchProjects()
    }
  }, [fetchProjects])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Project-scoped routes */}
          <Route
            path="/projects/:projectId/test-cases"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <TestCasesPageWithTree />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/test-plans"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <TestPlansPage />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/test-runs"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <TestRunsPage />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/test-runs/:id/report"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <TestRunReport />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/bugs"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <BugsPage />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />

          {/* Legacy routes - redirect to project-scoped */}
          <Route
            path="/test-cases"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <TestCasesPageWithTree />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-plans"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <TestPlansPage />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-runs"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <TestRunsPage />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-runs/:id/report"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <TestRunReport />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bugs"
            element={
              <ProtectedRoute>
                <ProjectRoute>
                  <BugsPage />
                </ProjectRoute>
              </ProtectedRoute>
            }
          />

          {/* Public routes */}
          <Route path="/report/test-run/:id" element={<TestRunReportPublic />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
