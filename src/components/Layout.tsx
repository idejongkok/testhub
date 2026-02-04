import { ReactNode, useState, useEffect } from 'react'
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
  ChevronDown,
  Menu,
  PanelLeftClose,
  X
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
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

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

  // Shared sidebar content (used in both desktop and mobile)
  const sidebarContent = (isMobile: boolean) => {
    const isCollapsed = !isMobile && collapsed

    return (
      <div className="flex flex-col h-full">
        {/* Logo & Toggle */}
        <div className={cn(
          'border-b border-gray-200 flex items-center',
          isCollapsed ? 'px-3 py-5 justify-center' : 'px-6 py-5 justify-between'
        )}>
          {isCollapsed ? (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Expand sidebar"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <>
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
              {isMobile ? (
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Close menu"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              ) : (
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Project Selector */}
        <div className={cn(
          'border-b border-gray-200',
          isCollapsed ? 'px-2 py-3' : 'px-4 py-3'
        )}>
          {loading ? (
            <div className={cn(
              'flex items-center bg-gray-50 rounded-lg',
              isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
            )}>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0"></div>
              {!isCollapsed && <span className="ml-2 text-gray-500 text-sm">Loading project...</span>}
            </div>
          ) : currentProject ? (
            <button
              className={cn(
                'w-full flex items-center bg-gray-50 rounded-lg hover:bg-gray-100',
                isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2 text-sm'
              )}
              title={isCollapsed ? currentProject.name : undefined}
            >
              <div className="flex items-center min-w-0 gap-2">
                <img
                  src="https://www.roaminrabbit.com/static/media/header-logo.94e9994b8927d2a24748.webp"
                  alt="Project Logo"
                  className="w-6 h-6 object-contain flex-shrink-0"
                />
                {!isCollapsed && (
                  <span className="truncate font-medium">
                    {currentProject.name}
                  </span>
                )}
              </div>
              {!isCollapsed && <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className={cn(
                'w-full flex items-center bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100',
                isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2 text-sm'
              )}
              title={isCollapsed ? 'Select a project' : undefined}
            >
              <div className="flex items-center min-w-0">
                <FolderKanban className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="ml-2 truncate text-yellow-700 text-xs">
                    Select a project
                  </span>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          'flex-1 py-4 space-y-1',
          isCollapsed ? 'px-2' : 'px-4'
        )}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const isProjectRequired = item.name !== 'Projects'
            const isDisabled = isProjectRequired && !currentProject

            if (isDisabled) {
              return (
                <div
                  key={item.name}
                  className={cn(
                    'flex items-center text-sm font-medium rounded-lg text-gray-400 cursor-not-allowed',
                    isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
                  )}
                  title={isCollapsed ? item.name : 'Please select a project first'}
                >
                  <item.icon className={cn('w-5 h-5', !isCollapsed && 'mr-3')} />
                  {!isCollapsed && item.name}
                </div>
              )
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center text-sm font-medium rounded-lg transition-colors',
                  isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn('w-5 h-5', !isCollapsed && 'mr-3')} />
                {!isCollapsed && item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className={cn(
          'py-4 border-t border-gray-200',
          isCollapsed ? 'px-2' : 'px-4'
        )}>
          <div className={cn(
            'flex items-center mb-3',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            <div className={cn(
              'flex items-center',
              isCollapsed ? 'justify-center' : 'min-w-0'
            )}>
              <div
                className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0"
                title={isCollapsed ? user?.email : undefined}
              >
                <span className="text-sm font-medium text-primary-700">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              {!isCollapsed && (
                <span className="ml-2 text-sm text-gray-700 truncate">
                  {user?.email}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              'w-full text-gray-700',
              isCollapsed ? 'justify-center px-2' : 'justify-start'
            )}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className={cn('w-4 h-4', !isCollapsed && 'mr-2')} />
            {!isCollapsed && 'Sign Out'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 relative flex-shrink-0">
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
          <span className="text-lg font-bold text-primary-600">TestHub</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        'md:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent(true)}
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        'hidden md:block fixed inset-y-0 left-0 bg-white border-r border-gray-200 transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {sidebarContent(false)}
      </div>

      {/* Main Content */}
      <div className={cn(
        'h-screen flex flex-col transition-all duration-300',
        'pt-14 md:pt-0',
        collapsed ? 'md:pl-16' : 'md:pl-64'
      )}>
        <main className="p-4 md:p-6 flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Footer Signature */}
        <footer className="border-t border-gray-200 bg-white px-8 py-4 flex-shrink-0">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <span className="font-medium text-primary-600">TestHub</span>
            <span className="mx-2">by</span>
            <span className="font-medium">Uno - Ide Jongkok</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
