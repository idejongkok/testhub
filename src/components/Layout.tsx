import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import {
  FolderKanban,
  FileCheck,
  ClipboardList,
  PlayCircle,
  Bug,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { currentProject, projects, loading } = useProjectStore()

  // Generate navigation with project ID in URLs
  const navigation = [
    { name: 'Projects', href: '/dashboard', icon: FolderKanban },
    {
      name: 'Test Cases',
      href: currentProject ? `/projects/${currentProject.id}/test-cases` : '/test-cases',
      icon: FileCheck
    },
    {
      name: 'Test Plans',
      href: currentProject ? `/projects/${currentProject.id}/test-plans` : '/test-plans',
      icon: ClipboardList
    },
    {
      name: 'Test Runs',
      href: currentProject ? `/projects/${currentProject.id}/test-runs` : '/test-runs',
      icon: PlayCircle
    },
    {
      name: 'Bugs',
      href: currentProject ? `/projects/${currentProject.id}/bugs` : '/bugs',
      icon: Bug
    },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 relative flex-shrink-0">
                {/* Hub Icon */}
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#0891b2" opacity="0.1"/>
                  <circle cx="20" cy="20" r="3" fill="#0891b2"/>
                  <line x1="20" y1="20" x2="20" y2="8" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="20" y1="20" x2="32" y2="20" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="20" y1="20" x2="20" y2="32" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="20" y1="20" x2="8" y2="20" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="20" cy="8" r="2.5" fill="#ffffff" stroke="#0891b2" strokeWidth="1.5"/>
                  <circle cx="32" cy="20" r="2.5" fill="#ffffff" stroke="#0891b2" strokeWidth="1.5"/>
                  <circle cx="20" cy="32" r="2.5" fill="#ffffff" stroke="#0891b2" strokeWidth="1.5"/>
                  <circle cx="8" cy="20" r="2.5" fill="#ffffff" stroke="#0891b2" strokeWidth="1.5"/>
                  <path d="M19 8 L19.5 8.5 L21.5 6.5" stroke="#0891b2" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-600">
                  TestHub
                </h1>
                <p className="text-xs text-gray-500">Quality Assurance Platform</p>
              </div>
            </div>
          </div>

          {/* Project Selector */}
          <div className="px-4 py-3 border-b border-gray-200">
            {loading ? (
              <div className="w-full flex items-center px-3 py-2 text-sm bg-gray-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0"></div>
                <span className="ml-2 text-gray-500 text-sm">Loading project...</span>
              </div>
            ) : currentProject ? (
              <button className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center min-w-0 gap-2">
                  <img
                    src="https://www.roaminrabbit.com/static/media/header-logo.94e9994b8927d2a24748.webp"
                    alt="Project Logo"
                    className="w-6 h-6 object-contain flex-shrink-0"
                  />
                  <span className="truncate font-medium">
                    {currentProject.name}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100"
              >
                <div className="flex items-center min-w-0">
                  <FolderKanban className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <span className="ml-2 truncate text-yellow-700 text-xs">
                    Select a project
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center min-w-0">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary-700">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <span className="ml-2 text-sm text-gray-700 truncate">
                  {user?.email}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-gray-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
