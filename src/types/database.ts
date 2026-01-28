export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TestType = 'functional_web' | 'functional_mobile' | 'api'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Status = 'draft' | 'ready' | 'deprecated'
export type RunStatus = 'not_started' | 'in_progress' | 'completed'
export type ResultStatus = 'passed' | 'failed' | 'blocked' | 'skipped' | 'in_progress' | 'untested'
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix'
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low'
export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: ProjectRole
          invited_by: string | null
          joined_at: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: ProjectRole
          invited_by?: string | null
          joined_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: ProjectRole
          invited_by?: string | null
          joined_at?: string
          created_at?: string
        }
      }
      test_suites: {
        Row: {
          id: string
          project_id: string
          parent_id: string | null
          name: string
          description: string | null
          position: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          parent_id?: string | null
          name: string
          description?: string | null
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          parent_id?: string | null
          name?: string
          description?: string | null
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      test_cases: {
        Row: {
          id: string
          project_id: string
          suite_id: string | null
          test_case_code: string
          title: string
          description: string | null
          test_type: TestType
          priority: Priority
          status: Status
          preconditions: string | null
          steps: Json | null
          expected_result: string | null
          api_method: string | null
          api_endpoint: string | null
          api_headers: Json | null
          api_body: Json | null
          api_expected_status: number | null
          api_expected_response: Json | null
          mobile_platform: string | null
          mobile_device: string | null
          tags: string[] | null
          position: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          suite_id?: string | null
          test_case_code?: string
          title: string
          description?: string | null
          test_type: TestType
          priority?: Priority
          status?: Status
          preconditions?: string | null
          steps?: Json | null
          expected_result?: string | null
          api_method?: string | null
          api_endpoint?: string | null
          api_headers?: Json | null
          api_body?: Json | null
          api_expected_status?: number | null
          api_expected_response?: Json | null
          mobile_platform?: string | null
          mobile_device?: string | null
          tags?: string[] | null
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          suite_id?: string | null
          test_case_code?: string
          title?: string
          description?: string | null
          test_type?: TestType
          priority?: Priority
          status?: Status
          preconditions?: string | null
          steps?: Json | null
          expected_result?: string | null
          api_method?: string | null
          api_endpoint?: string | null
          api_headers?: Json | null
          api_body?: Json | null
          api_expected_status?: number | null
          api_expected_response?: Json | null
          mobile_platform?: string | null
          mobile_device?: string | null
          tags?: string[] | null
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      test_plans: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          start_date: string | null
          end_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      test_plan_cases: {
        Row: {
          id: string
          test_plan_id: string
          test_case_id: string
          created_at: string
        }
        Insert: {
          id?: string
          test_plan_id: string
          test_case_id: string
          created_at?: string
        }
        Update: {
          id?: string
          test_plan_id?: string
          test_case_id?: string
          created_at?: string
        }
      }
      test_runs: {
        Row: {
          id: string
          project_id: string
          test_plan_id: string | null
          name: string
          description: string | null
          environment: string | null
          run_status: RunStatus
          started_at: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          test_plan_id?: string | null
          name: string
          description?: string | null
          environment?: string | null
          run_status?: RunStatus
          started_at?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          test_plan_id?: string | null
          name?: string
          description?: string | null
          environment?: string | null
          run_status?: RunStatus
          started_at?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      test_run_results: {
        Row: {
          id: string
          test_run_id: string
          test_case_id: string
          result_status: ResultStatus
          actual_result: string | null
          comments: string | null
          attachments: Json | null
          execution_time: number | null
          executed_by: string | null
          executed_at: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          test_run_id: string
          test_case_id: string
          result_status?: ResultStatus
          actual_result?: string | null
          comments?: string | null
          attachments?: Json | null
          execution_time?: number | null
          executed_by?: string | null
          executed_at?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          test_run_id?: string
          test_case_id?: string
          result_status?: ResultStatus
          actual_result?: string | null
          comments?: string | null
          attachments?: Json | null
          execution_time?: number | null
          executed_by?: string | null
          executed_at?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bugs: {
        Row: {
          id: string
          project_id: string
          test_run_id: string | null
          test_case_id: string | null
          test_run_result_id: string | null
          title: string
          description: string | null
          severity: BugSeverity
          status: BugStatus
          steps_to_reproduce: string | null
          expected_behavior: string | null
          actual_behavior: string | null
          environment: string | null
          browser: string | null
          device: string | null
          os: string | null
          attachments: Json | null
          external_link: string | null
          assigned_to: string | null
          reported_by: string | null
          resolved_by: string | null
          resolved_at: string | null
          tags: string[] | null
          feature: string | null
          platform: string | null
          jira_ticket_key: string | null
          jira_ticket_url: string | null
          jira_created_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          test_run_id?: string | null
          test_case_id?: string | null
          test_run_result_id?: string | null
          title: string
          description?: string | null
          severity?: BugSeverity
          status?: BugStatus
          steps_to_reproduce?: string | null
          expected_behavior?: string | null
          actual_behavior?: string | null
          environment?: string | null
          browser?: string | null
          device?: string | null
          os?: string | null
          attachments?: Json | null
          external_link?: string | null
          assigned_to?: string | null
          reported_by?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          tags?: string[] | null
          feature?: string | null
          platform?: string | null
          jira_ticket_key?: string | null
          jira_ticket_url?: string | null
          jira_created_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          test_run_id?: string | null
          test_case_id?: string | null
          test_run_result_id?: string | null
          title?: string
          description?: string | null
          severity?: BugSeverity
          status?: BugStatus
          steps_to_reproduce?: string | null
          expected_behavior?: string | null
          actual_behavior?: string | null
          environment?: string | null
          browser?: string | null
          device?: string | null
          os?: string | null
          attachments?: Json | null
          external_link?: string | null
          assigned_to?: string | null
          reported_by?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          tags?: string[] | null
          feature?: string | null
          platform?: string | null
          jira_ticket_key?: string | null
          jira_ticket_url?: string | null
          jira_created_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bug_comments: {
        Row: {
          id: string
          bug_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bug_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bug_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      jira_configurations: {
        Row: {
          id: string
          project_id: string
          jira_base_url: string
          jira_project_key: string
          jira_email: string
          jira_api_token: string
          default_issue_type: string
          enabled: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          jira_base_url: string
          jira_project_key: string
          jira_email: string
          jira_api_token: string
          default_issue_type?: string
          enabled?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          jira_base_url?: string
          jira_project_key?: string
          jira_email?: string
          jira_api_token?: string
          default_issue_type?: string
          enabled?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
