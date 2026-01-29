import { useAuthStore } from '@/store/authStore'

export function usePermissions() {
  const userRole = useAuthStore((state) => state.userRole)

  // Only allow admin actions if role is explicitly 'administrator'
  const isAdmin = userRole === 'administrator'

  // Debug log - can be removed after testing
  if (process.env.NODE_ENV === 'development') {
    console.log('[usePermissions] userRole:', userRole, '| isAdmin:', isAdmin)
  }

  return {
    isAdmin,
    canDelete: isAdmin,
    canConfigureJira: isAdmin,
    canManageTeam: isAdmin,
  }
}
