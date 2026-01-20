import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Plus, 
  FileCheck, 
  Trash2, 
  Edit2, 
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderPlus,
  GripVertical,
  MoreVertical
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database, TestType, Priority, Status } from '@/types/database'

type TestCase = Database['public']['Tables']['test_cases']['Row']
type TestSuite = Database['public']['Tables']['test_suites']['Row']

interface TreeNode {
  id: string
  type: 'suite' | 'case'
  data: TestSuite | TestCase
  children?: TreeNode[]
  isExpanded?: boolean
}

export default function TestCasesPageV2() {
  const { currentProject } = useProjectStore()
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  
  // Modals
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showSuiteModal, setShowSuiteModal] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null)
  const [parentSuiteId, setParentSuiteId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<TestType | 'all'>('all')

  const [suiteFormData, setS