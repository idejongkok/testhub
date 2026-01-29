import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card } from './ui/Card'
import { X, UserPlus, Trash2, Shield, User } from 'lucide-react'
import { Database, ProjectRole, UserRole } from '@/types/database'
import { usePermissions } from '@/hooks/usePermissions'

type ProjectMember = Database['public']['Tables']['project_members']['Row'] & {
  user_email?: string
  user_name?: string
  user_role?: UserRole
}

interface ProjectTeamModalProps {
  projectId: string
  projectName: string
  onClose: () => void
}

export default function ProjectTeamModal({ projectId, projectName, onClose }: ProjectTeamModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { canManageTeam } = usePermissions()

  useEffect(() => {
    loadMembers()
  }, [projectId])

  const loadMembers = async () => {
    setLoading(true)
    try {
      // First get project members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .order('joined_at', { ascending: false })

      if (membersError) throw membersError

      if (!membersData || membersData.length === 0) {
        setMembers([])
        return
      }

      // Get user profiles for all member user_ids
      const userIds = membersData.map(m => m.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role')
        .in('id', userIds)

      if (profilesError) {
        console.warn('Error fetching user profiles:', profilesError)
      }

      // Create a map of user profiles by id
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      )

      // Map user data including global role
      const membersWithUser = membersData.map(m => {
        const profile = profilesMap.get(m.user_id)
        return {
          ...m,
          user_email: profile?.email,
          user_name: profile?.full_name,
          user_role: (profile?.role || 'user') as UserRole
        }
      })

      setMembers(membersWithUser)
    } catch (err: any) {
      console.error('Error loading members:', err)
    } finally {
      setLoading(false)
    }
  }

  const addMember = async () => {
    setError('')
    setSuccess('')

    if (!email) {
      setError('Please enter an email address')
      return
    }

    if (!canManageTeam) {
      setError('Only administrators can add team members')
      return
    }

    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (userError || !userData) {
        setError('User not found. Make sure they have signed up first.')
        return
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Add member (role defaults to 'member' for project access)
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userData.id,
          role: 'member',
          invited_by: user.id
        })

      if (insertError) {
        if (insertError.code === '23505') {
          setError('User is already a member of this project')
        } else {
          throw insertError
        }
        return
      }

      setSuccess(`Successfully added ${email} to the project`)
      setEmail('')
      loadMembers()
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
    }
  }

  const removeMember = async (memberId: string) => {
    if (!canManageTeam) {
      setError('Only administrators can remove team members')
      return
    }

    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setSuccess('Member removed successfully')
      loadMembers()
    } catch (err: any) {
      setError(err.message || 'Failed to remove member')
    }
  }

  const getUserRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'administrator': return <Shield className="w-4 h-4 text-purple-600" />
      case 'user': return <User className="w-4 h-4 text-blue-600" />
    }
  }

  const getUserRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'administrator': return 'bg-purple-100 text-purple-800'
      case 'user': return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
              <p className="text-sm text-gray-600 mt-1">{projectName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Add Member Form - Only for administrators */}
          {canManageTeam ? (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Add Team Member</h3>
              </div>

              <div className="flex gap-2">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter user email"
                  type="email"
                  className="flex-1"
                />
                <Button onClick={addMember}>
                  Add
                </Button>
              </div>

              {error && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-3 text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                  {success}
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500">
                <p><strong>Note:</strong> User's permission level (Administrator/User) is set globally in their profile, not per-project.</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                Only administrators can add or remove team members.
              </p>
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Current Members ({members.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No members yet</div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {(member.user_email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.user_name || member.user_email || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.user_email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getUserRoleBadgeColor(member.user_role || 'user')}`}>
                        {getUserRoleIcon(member.user_role || 'user')}
                        {member.user_role === 'administrator' ? 'Admin' : 'User'}
                      </span>

                      {canManageTeam && member.role !== 'owner' && (
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
